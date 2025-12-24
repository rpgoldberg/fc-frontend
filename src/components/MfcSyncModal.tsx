/**
 * MFC Account Sync Modal
 *
 * Multi-step wizard for syncing collection from MyFigureCollection.net.
 * Uses centralized MfcCookiesModal for cookie management (accessible via navbar padlock).
 *
 * Steps:
 * 1. Check Cookies - Verify cookies are stored, prompt to set them if not
 * 2. Validating - Validates cookies with MFC
 * 3. Syncing - Shows sync progress and queue status
 * 4. Complete - Summary of synced items
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Progress,
  Badge,
  Box,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  useColorModeValue,
  Divider,
  Icon,
  Spinner,
} from '@chakra-ui/react';
import {
  FaSync,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLock,
  FaUser,
} from 'react-icons/fa';
import {
  validateMfcCookies,
  executeFullSync,
  getQueueStats,
} from '../api/scraper';
import { useAuthStore } from '../stores/authStore';
import { MfcCookies, MfcCookieValidationResult, MfcSyncResult, MfcQueueStats } from '../types';
import { retrieveMfcCookies, hasMfcCookies } from '../utils/crypto';
import { createLogger } from '../utils/logger';

const logger = createLogger('MFC_SYNC');

interface MfcSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
  onOpenCookiesModal?: () => void; // Callback to open MfcCookiesModal
}

type SyncStep = 'checking' | 'validating' | 'syncing' | 'complete';

/**
 * Parse stored cookie string into MfcCookies object
 * The crypto module stores cookies as a raw string (cookie header format or JSON)
 */
function parseCookiesFromStored(cookieString: string): MfcCookies | null {
  try {
    // Try JSON format first
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

const MfcSyncModal: React.FC<MfcSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
  onOpenCookiesModal,
}) => {
  const [step, setStep] = useState<SyncStep>('checking');
  const [cookies, setCookies] = useState<MfcCookies | null>(null);
  const [validationResult, setValidationResult] = useState<MfcCookieValidationResult | null>(null);
  const [syncResult, setSyncResult] = useState<MfcSyncResult | null>(null);
  const [queueStats, setQueueStats] = useState<MfcQueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCookies, setHasCookies] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast();
  const { user } = useAuthStore();

  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Check for stored cookies when modal opens
  useEffect(() => {
    if (isOpen) {
      const checkCookies = async () => {
        setStep('checking');
        setIsLoading(true);
        setError(null);

        try {
          // Check if cookies exist
          const storedCookies = await retrieveMfcCookies();
          const hasStoredCookies = hasMfcCookies();

          if (storedCookies && hasStoredCookies) {
            const parsed = parseCookiesFromStored(storedCookies);
            if (parsed) {
              setCookies(parsed);
              setHasCookies(true);
              // Auto-start validation
              setStep('validating');
              await validateStoredCookies(parsed);
            } else {
              setHasCookies(false);
              setError('Stored cookies are invalid. Please update your MFC cookies.');
            }
          } else {
            setHasCookies(false);
          }
        } catch (err) {
          logger.error('Failed to check cookies:', err);
          setHasCookies(false);
        } finally {
          setIsLoading(false);
        }
      };

      checkCookies();
    }
  }, [isOpen]);

  // Validate cookies with the scraper service
  const validateStoredCookies = useCallback(async (cookiesToValidate: MfcCookies) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await validateMfcCookies(cookiesToValidate);
      setValidationResult(result);

      if (result.valid) {
        logger.info('Cookies validated successfully');
        toast({
          title: 'MFC Connected',
          description: `Logged in as ${result.username || 'user'}`,
          status: 'success',
          duration: 3000,
        });
      } else {
        setError(result.error || 'Invalid or expired cookies');
        setStep('checking');
        setHasCookies(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Validation failed';
      setError(message);
      setStep('checking');
      logger.error('Cookie validation failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Poll queue stats during sync
  useEffect(() => {
    if (step === 'syncing') {
      const pollStats = async () => {
        try {
          const stats = await getQueueStats();
          setQueueStats(stats);
        } catch (err) {
          logger.warn('Failed to poll queue stats:', err);
        }
      };

      pollStats();
      pollIntervalRef.current = setInterval(pollStats, 2000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [step]);

  const handleStartSync = async () => {
    if (!user?._id || !cookies || !validationResult?.valid) return;

    setError(null);
    setIsLoading(true);
    setStep('syncing');

    try {
      // Generate a unique session ID for this sync
      const sessionId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const result = await executeFullSync({
        cookies,
        userId: user._id,
        sessionId,
        includeLists: false,
        skipCached: true,
      });

      setSyncResult(result);
      setStep('complete');

      logger.info('Sync completed:', result);

      toast({
        title: 'Sync complete',
        description: `Queued ${result.queuedCount} items for processing`,
        status: 'success',
        duration: 5000,
      });

      if (result.queuedCount > 0) {
        onSyncComplete();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      setStep('validating'); // Go back to validation step to retry
      logger.error('Sync failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCookiesModal = () => {
    // Close this modal and open the cookies modal
    onClose();
    onOpenCookiesModal?.();
  };

  const handleRetryValidation = async () => {
    if (cookies) {
      setStep('validating');
      await validateStoredCookies(cookies);
    }
  };

  const handleClose = () => {
    setStep('checking');
    setCookies(null);
    setValidationResult(null);
    setSyncResult(null);
    setQueueStats(null);
    setError(null);
    setHasCookies(false);
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
      ) : !hasCookies ? (
        <>
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">MFC Cookies Required</Text>
              <Text fontSize="sm">
                To sync your MFC collection, you need to provide your MFC session cookies.
                Use the padlock icon in the navbar to set up your cookies.
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
              Your MFC cookies are stored securely in your browser and are never saved on our servers.
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
      {isLoading ? (
        <>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text>Validating cookies with MyFigureCollection...</Text>
        </>
      ) : validationResult?.valid ? (
        <>
          <Icon as={FaCheckCircle} boxSize={16} color="green.500" />
          <VStack spacing={2}>
            <Text fontSize="xl" fontWeight="bold">Connected!</Text>
            <HStack>
              <Icon as={FaUser} color="gray.500" />
              <Text color="gray.500">Logged in as:</Text>
              <Badge colorScheme="green" fontSize="md">{validationResult.username || 'MFC User'}</Badge>
            </HStack>
          </VStack>
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Ready to sync</Text>
              <Text fontSize="sm">
                Click &quot;Start Sync&quot; to export your collection from MFC and queue items for processing.
              </Text>
            </Box>
          </Alert>
        </>
      ) : (
        <>
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Validation failed</Text>
              <Text fontSize="sm">{error || 'Invalid or expired cookies'}</Text>
            </Box>
          </Alert>
          <Text fontSize="sm" color="gray.500">
            Your cookies may have expired. Please update them and try again.
          </Text>
        </>
      )}
    </VStack>
  );

  const renderSyncingStep = () => (
    <VStack spacing={4} py={4}>
      <Progress size="lg" isIndeterminate w="100%" colorScheme="blue" borderRadius="md" />

      <Text fontWeight="bold">Syncing your collection...</Text>
      <Text fontSize="sm" color="gray.500">
        This may take a few minutes depending on your collection size.
      </Text>

      {queueStats && (
        <Box w="100%" borderWidth={1} borderRadius="md" p={4} borderColor={borderColor}>
          <Text fontWeight="bold" mb={3}>Queue Status</Text>
          <StatGroup>
            <Stat>
              <StatLabel>Hot Queue</StatLabel>
              <StatNumber color="red.500">{queueStats.queues.hot}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Warm Queue</StatLabel>
              <StatNumber color="orange.500">{queueStats.queues.warm}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Cold Queue</StatLabel>
              <StatNumber color="blue.500">{queueStats.queues.cold}</StatNumber>
            </Stat>
          </StatGroup>

          <Divider my={3} />

          <HStack justify="space-between" fontSize="sm">
            <Text>Processing: {queueStats.processing}</Text>
            <Text>Completed: {queueStats.completed}</Text>
            <Text>Failed: {queueStats.failed}</Text>
          </HStack>

          {queueStats.rateLimit.active && (
            <Alert status="warning" size="sm" mt={3} borderRadius="md">
              <AlertIcon />
              Rate limited - waiting {Math.round(queueStats.rateLimit.currentDelayMs / 1000)}s
            </Alert>
          )}
        </Box>
      )}
    </VStack>
  );

  const renderCompleteStep = () => (
    <VStack spacing={4} align="stretch">
      {syncResult && (
        <>
          <Alert
            status={syncResult.errors.length > 0 ? 'warning' : 'success'}
            borderRadius="md"
          >
            <AlertIcon as={syncResult.errors.length > 0 ? FaExclamationTriangle : FaCheckCircle} />
            <Box>
              <Text fontWeight="bold">Sync Complete</Text>
              <Text fontSize="sm">
                Parsed {syncResult.parsedCount} items, queued {syncResult.queuedCount} for processing
                {syncResult.skippedCount > 0 && `, ${syncResult.skippedCount} duplicates skipped`}
              </Text>
            </Box>
          </Alert>

          <StatGroup>
            <Stat>
              <StatLabel>Owned</StatLabel>
              <StatNumber color="green.500">{syncResult.stats.owned}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Ordered</StatLabel>
              <StatNumber color="blue.500">{syncResult.stats.ordered}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Wished</StatLabel>
              <StatNumber color="purple.500">{syncResult.stats.wished}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>NSFW</StatLabel>
              <StatNumber color="red.500">{syncResult.stats.nsfw}</StatNumber>
            </Stat>
          </StatGroup>

          {syncResult.errors.length > 0 && (
            <>
              <Text fontWeight="bold" color="orange.500">
                Warnings ({syncResult.errors.length}):
              </Text>
              <Box maxH="150px" overflowY="auto" borderWidth={1} borderRadius="md" p={2}>
                {syncResult.errors.slice(0, 10).map((errorMsg, index) => (
                  <Text key={index} fontSize="sm" color="orange.600">
                    {errorMsg}
                  </Text>
                ))}
                {syncResult.errors.length > 10 && (
                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    ...and {syncResult.errors.length - 10} more
                  </Text>
                )}
              </Box>
            </>
          )}

          <Alert status="info" borderRadius="md" size="sm">
            <AlertIcon />
            <Text fontSize="sm">
              Items are being processed in the background. New figures will appear in your
              collection as they complete.
            </Text>
          </Alert>
        </>
      )}
    </VStack>
  );

  const renderStepContent = () => {
    switch (step) {
      case 'checking':
        return renderCheckingStep();
      case 'validating':
        return renderValidatingStep();
      case 'syncing':
        return renderSyncingStep();
      case 'complete':
        return renderCompleteStep();
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
        return isLoading ? null : validationResult?.valid ? (
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              colorScheme="green"
              onClick={handleStartSync}
              leftIcon={<Icon as={FaSync} />}
            >
              Start Sync
            </Button>
          </HStack>
        ) : (
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              leftIcon={<Icon as={FaLock} />}
              onClick={handleOpenCookiesModal}
            >
              Update Cookies
            </Button>
            <Button variant="outline" onClick={handleRetryValidation}>
              Retry
            </Button>
          </HStack>
        );
      case 'syncing':
        return null;
      case 'complete':
        return (
          <Button colorScheme="blue" onClick={handleClose}>
            Close
          </Button>
        );
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'checking':
        return 'MFC Account Sync';
      case 'validating':
        return 'Validating Connection';
      case 'syncing':
        return 'Syncing Collection';
      case 'complete':
        return 'Sync Complete';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
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
