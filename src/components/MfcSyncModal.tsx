/**
 * MFC Sync Modal
 *
 * Simplified wizard for initiating sync with MyFigureCollection.net.
 * Once sync starts, the modal closes and progress is shown in SyncStatusBanner.
 *
 * Steps:
 * 1. Check Cookies - Verify cookies are stored, prompt to set them if not
 * 2. Validating - Validates cookies with MFC
 * 3. Ready - Confirmation to start sync
 *
 * After starting sync, the modal closes and SyncStatusBanner takes over.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  useToast,
  Badge,
  Box,
  Alert,
  AlertIcon,
  Icon,
  Spinner,
} from '@chakra-ui/react';
import {
  FaSync,
  FaCheckCircle,
  FaLock,
  FaUser,
} from 'react-icons/fa';
import {
  validateMfcCookies,
  executeFullSync,
  createSyncJob,
} from '../api/scraper';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';
import {
  MfcCookies,
  MfcCookieValidationResult,
} from '../types';
import { retrieveMfcCookies, hasMfcCookies } from '../utils/crypto';
import { createLogger } from '../utils/logger';

const logger = createLogger('MFC_SYNC');

interface MfcSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
  onOpenCookiesModal?: () => void;
}

type SyncStep = 'checking' | 'validating' | 'ready';

/**
 * Parse stored cookie string into MfcCookies object
 */
function parseCookiesFromStored(cookieString: string): MfcCookies | null {
  try {
    const parsed = JSON.parse(cookieString);
    if (parsed.PHPSESSID && parsed.sesUID && parsed.sesDID) {
      return {
        PHPSESSID: parsed.PHPSESSID,
        sesUID: parsed.sesUID,
        sesDID: parsed.sesDID,
      };
    }
  } catch {
    // Not JSON, try cookie header format
  }

  // Try cookie header format: "PHPSESSID=abc123; sesUID=12345; sesDID=67890"
  const patterns = {
    PHPSESSID: /PHPSESSID[=:]\s*["']?([a-zA-Z0-9]+)["']?/i,
    sesUID: /sesUID[=:]\s*["']?(\d+)["']?/i,
    sesDID: /sesDID[=:]\s*["']?(\d+)["']?/i,
  };

  const result: Partial<MfcCookies> = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = cookieString.match(pattern);
    if (match) {
      result[key as keyof MfcCookies] = match[1];
    }
  }

  if (result.PHPSESSID && result.sesUID && result.sesDID) {
    return result as MfcCookies;
  }

  return null;
}

/**
 * Generate a unique session ID for this sync.
 */
function generateSessionId(): string {
  return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const MfcSyncModal: React.FC<MfcSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
  onOpenCookiesModal,
}) => {
  const [step, setStep] = useState<SyncStep>('checking');
  const [cookies, setCookies] = useState<MfcCookies | null>(null);
  const [validationResult, setValidationResult] = useState<MfcCookieValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCookiesStored, setHasCookiesStored] = useState(false);

  const toast = useToast();
  const { user } = useAuthStore();
  const { startSync, isActive } = useSyncStore();

  // Validate cookies with the scraper service
  const validateStoredCookies = useCallback(
    async (cookiesToValidate: MfcCookies) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await validateMfcCookies(cookiesToValidate);
        setValidationResult(result);

        if (result.valid) {
          logger.info('Cookies validated successfully');
          setStep('ready');
          toast({
            title: 'MFC Connected',
            description: `Logged in as ${result.username || 'user'}`,
            status: 'success',
            duration: 3000,
          });
        } else {
          setError(result.error || 'Invalid or expired cookies');
          setStep('checking');
          setHasCookiesStored(false);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Validation failed';
        setError(message);
        setStep('checking');
        logger.error('Cookie validation failed:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  // Check for stored cookies when modal opens
  useEffect(() => {
    if (isOpen) {
      const checkCookies = async () => {
        setStep('checking');
        setIsLoading(true);
        setError(null);

        try {
          const storedCookies = await retrieveMfcCookies();
          const hasStoredCookies = hasMfcCookies();

          if (storedCookies && hasStoredCookies) {
            const parsed = parseCookiesFromStored(storedCookies);
            if (parsed) {
              setCookies(parsed);
              setHasCookiesStored(true);
              setStep('validating');
              await validateStoredCookies(parsed);
            } else {
              setHasCookiesStored(false);
              setError('Stored cookies are invalid. Please update your MFC cookies.');
            }
          } else {
            setHasCookiesStored(false);
          }
        } catch (err) {
          logger.error('Failed to check cookies:', err);
          setHasCookiesStored(false);
        } finally {
          setIsLoading(false);
        }
      };

      checkCookies();
    }
  }, [isOpen, validateStoredCookies]);

  // Start the sync and close modal
  const handleStartSync = async () => {
    if (!user?._id || !cookies || !validationResult?.valid) return;
    if (isActive) {
      toast({
        title: 'Sync already in progress',
        description: 'Please wait for the current sync to complete',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Generate session ID
      const sessionId = generateSessionId();

      // Create sync job first (enables SSE tracking)
      await createSyncJob({
        sessionId,
        includeLists: ['owned', 'ordered', 'wished'],
        skipCached: true,
      });

      // Start sync in global store (triggers SSE connection)
      startSync(sessionId);

      // Close modal - banner will show progress
      handleClose();

      // Execute the sync (this triggers the scraper)
      await executeFullSync({
        cookies,
        userId: user._id,
        sessionId,
        includeLists: false,
        skipCached: true,
      });

      logger.info('Sync initiated successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      setIsLoading(false);
      logger.error('Sync failed:', err);
    }
  };

  const handleOpenCookiesModal = () => {
    onClose();
    onOpenCookiesModal?.();
  };

  const handleClose = () => {
    setStep('checking');
    setCookies(null);
    setValidationResult(null);
    setError(null);
    setHasCookiesStored(false);
    setIsLoading(false);
    onClose();
  };

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderCheckingStep = () => (
    <VStack spacing={4} align="stretch" py={4}>
      {isLoading ? (
        <VStack spacing={4} py={8}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text>Checking for stored MFC cookies...</Text>
        </VStack>
      ) : !hasCookiesStored ? (
        <>
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">MFC Cookies Required</Text>
              <Text fontSize="sm">
                To sync your MFC collection, you need to provide your MFC session cookies. Use the
                padlock icon in the navbar to set up your cookies.
              </Text>
            </Box>
          </Alert>

          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <Box textAlign="center" py={4}>
            <Button
              colorScheme="blue"
              leftIcon={<Icon as={FaLock} />}
              onClick={handleOpenCookiesModal}
              size="lg"
            >
              Set Up MFC Cookies
            </Button>
          </Box>

          <Alert status="info" borderRadius="md" size="sm">
            <AlertIcon />
            <Text fontSize="sm">
              Your MFC cookies are stored securely in your browser and are never saved on our
              servers.
            </Text>
          </Alert>
        </>
      ) : (
        <VStack spacing={4} py={8}>
          <Icon as={FaCheckCircle} boxSize={12} color="green.500" />
          <Text>MFC cookies found! Proceeding to validation...</Text>
        </VStack>
      )}
    </VStack>
  );

  const renderValidatingStep = () => (
    <VStack spacing={6} py={8}>
      <Spinner size="xl" color="blue.500" thickness="4px" />
      <Text>Validating cookies with MyFigureCollection...</Text>
    </VStack>
  );

  const renderReadyStep = () => (
    <VStack spacing={6} py={8}>
      <Icon as={FaCheckCircle} boxSize={16} color="green.500" />
      <VStack spacing={2}>
        <Text fontSize="xl" fontWeight="bold">
          Ready to Sync
        </Text>
        <HStack>
          <Icon as={FaUser} color="gray.500" />
          <Text color="gray.500">Logged in as:</Text>
          <Badge colorScheme="green" fontSize="md">
            {validationResult?.username || 'MFC User'}
          </Badge>
        </HStack>
      </VStack>
      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">What happens next?</Text>
          <Text fontSize="sm">
            Your collection will be exported from MFC and items will be queued for processing.
            Progress will be shown in a banner at the top of the page.
          </Text>
        </Box>
      </Alert>
    </VStack>
  );

  const renderStepContent = () => {
    switch (step) {
      case 'checking':
        return renderCheckingStep();
      case 'validating':
        return renderValidatingStep();
      case 'ready':
        return renderReadyStep();
    }
  };

  const renderFooter = () => {
    switch (step) {
      case 'checking':
        return isLoading ? null : (
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
        );
      case 'validating':
        return null;
      case 'ready':
        return (
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              colorScheme="green"
              onClick={handleStartSync}
              leftIcon={<Icon as={FaSync} />}
              isLoading={isLoading}
              loadingText="Starting..."
            >
              Start Sync
            </Button>
          </HStack>
        );
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'checking':
        return 'Sync with MFC';
      case 'validating':
        return 'Validating Connection';
      case 'ready':
        return 'Ready to Sync';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <Icon as={FaSync} />
            <Text>{getStepTitle()}</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>{renderStepContent()}</ModalBody>
        <ModalFooter>{renderFooter()}</ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default MfcSyncModal;
