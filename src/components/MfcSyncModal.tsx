/**
 * MFC Account Sync Modal
 *
 * Multi-step wizard for syncing collection from MyFigureCollection.net.
 * Uses centralized MfcCookiesModal for cookie management (accessible via navbar padlock).
 *
 * Steps:
 * 1. Check Cookies - Verify cookies are stored, prompt to set them if not
 * 2. Validating - Validates cookies with MFC
 * 3. Syncing - Shows real-time sync progress via SSE (Server-Sent Events)
 * 4. Complete - Summary of synced items
 *
 * The syncing step uses SSE instead of polling for real-time updates.
 * Progress is tracked at the item level with live stats updates.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  FaTimes,
} from 'react-icons/fa';
import {
  validateMfcCookies,
  executeFullSync,
  createSyncJob,
  cancelSyncJob,
} from '../api/scraper';
import { useAuthStore } from '../stores/authStore';
import { useSyncEvents } from '../hooks/useSyncEvents';
import {
  MfcCookies,
  MfcCookieValidationResult,
  MfcSyncResult,
  SyncPhase,
  SyncJobStats,
  SseItemUpdateEvent,
  SseSyncCompleteEvent,
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

type SyncStep = 'checking' | 'validating' | 'syncing' | 'complete';

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

/**
 * Get human-readable phase label.
 */
function getPhaseLabel(phase: SyncPhase | null): string {
  switch (phase) {
    case 'validating':
      return 'Validating credentials...';
    case 'exporting':
      return 'Exporting from MFC...';
    case 'parsing':
      return 'Parsing collection data...';
    case 'queueing':
      return 'Queueing items for processing...';
    case 'enriching':
      return 'Enriching figure data...';
    case 'completed':
      return 'Sync complete!';
    case 'failed':
      return 'Sync failed';
    case 'cancelled':
      return 'Sync cancelled';
    default:
      return 'Preparing...';
  }
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCookies, setHasCookies] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [failedItems, setFailedItems] = useState<Array<{ mfcId: string; error?: string }>>([]);

  const toast = useToast();
  const { user } = useAuthStore();

  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // SSE hook for real-time sync progress
  const {
    connectionState,
    phase,
    stats,
    message,
    error: sseError,
    disconnect: disconnectSse,
  } = useSyncEvents({
    sessionId,
    enabled: step === 'syncing' && !!sessionId,
    onItemUpdate: useCallback((event: SseItemUpdateEvent) => {
      if (event.status === 'failed' && event.error) {
        setFailedItems((prev) => [...prev, { mfcId: event.mfcId, error: event.error }]);
      }
    }, []),
    onComplete: useCallback((event: SseSyncCompleteEvent) => {
      logger.info('Sync completed via SSE:', event);

      if (event.phase === 'completed') {
        // Convert SSE stats to MfcSyncResult format
        setSyncResult({
          success: true,
          parsedCount: event.stats.total,
          queuedCount: event.stats.total,
          skippedCount: event.stats.skipped,
          stats: {
            owned: 0, // We don't have breakdown in SSE stats
            ordered: 0,
            wished: 0,
            total: event.stats.total,
            nsfw: 0,
          },
          errors: [],
        });
        setStep('complete');

        toast({
          title: 'Sync complete',
          description: `Processed ${event.stats.completed} items successfully`,
          status: 'success',
          duration: 5000,
        });

        if (event.stats.completed > 0) {
          onSyncComplete();
        }
      } else if (event.phase === 'failed') {
        setError(event.message || 'Sync failed');
        setStep('validating'); // Go back to retry
      } else if (event.phase === 'cancelled') {
        setError('Sync was cancelled');
        setStep('validating');
      }
    }, [onSyncComplete, toast]),
    onError: useCallback((err: Error) => {
      logger.error('SSE connection error:', err);
      // Don't show error for normal completion/disconnection
    }, []),
  });

  // Check for stored cookies when modal opens
  useEffect(() => {
    if (isOpen) {
      const checkCookies = async () => {
        setStep('checking');
        setIsLoading(true);
        setError(null);
        setSessionId('');
        setFailedItems([]);
        setSyncResult(null);

        try {
          const storedCookies = await retrieveMfcCookies();
          const hasStoredCookies = hasMfcCookies();

          if (storedCookies && hasStoredCookies) {
            const parsed = parseCookiesFromStored(storedCookies);
            if (parsed) {
              setCookies(parsed);
              setHasCookies(true);
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
  const validateStoredCookies = useCallback(
    async (cookiesToValidate: MfcCookies) => {
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
    },
    [toast]
  );

  // Start the sync with SSE
  const handleStartSync = async () => {
    if (!user?._id || !cookies || !validationResult?.valid) return;

    setError(null);
    setIsLoading(true);
    setFailedItems([]);

    try {
      // Generate session ID
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);

      // Create sync job first (enables SSE tracking)
      await createSyncJob({
        sessionId: newSessionId,
        includeLists: ['owned', 'ordered', 'wished'],
        skipCached: true,
      });

      // Switch to syncing step - SSE hook will connect
      setStep('syncing');
      setIsLoading(false);

      // Execute the sync (this triggers the scraper)
      const result = await executeFullSync({
        cookies,
        userId: user._id,
        sessionId: newSessionId,
        includeLists: false,
        skipCached: true,
      });

      // Store the initial result (SSE will update with progress)
      logger.info('Initial sync result:', result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      setStep('validating');
      setIsLoading(false);
      logger.error('Sync failed:', err);
    }
  };

  // Cancel active sync
  const handleCancelSync = async () => {
    if (!sessionId) return;

    try {
      await cancelSyncJob(sessionId);
      disconnectSse();
      setStep('validating');
      toast({
        title: 'Sync cancelled',
        status: 'info',
        duration: 3000,
      });
    } catch (err) {
      logger.error('Failed to cancel sync:', err);
    }
  };

  const handleOpenCookiesModal = () => {
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
    if (step === 'syncing') {
      disconnectSse();
    }
    setStep('checking');
    setCookies(null);
    setValidationResult(null);
    setSyncResult(null);
    setError(null);
    setHasCookies(false);
    setSessionId('');
    setFailedItems([]);
    onClose();
  };

  // Calculate progress percentage
  const progressPercent = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    return Math.round(((stats.completed + stats.failed + stats.skipped) / stats.total) * 100);
  }, [stats]);

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
      {isLoading ? (
        <>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text>Validating cookies with MyFigureCollection...</Text>
        </>
      ) : validationResult?.valid ? (
        <>
          <Icon as={FaCheckCircle} boxSize={16} color="green.500" />
          <VStack spacing={2}>
            <Text fontSize="xl" fontWeight="bold">
              Connected!
            </Text>
            <HStack>
              <Icon as={FaUser} color="gray.500" />
              <Text color="gray.500">Logged in as:</Text>
              <Badge colorScheme="green" fontSize="md">
                {validationResult.username || 'MFC User'}
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
              <Text fontWeight="bold">Ready to sync</Text>
              <Text fontSize="sm">
                Click &quot;Start Sync&quot; to export your collection from MFC and queue items for
                processing.
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
      {/* Progress bar */}
      <Box w="100%">
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="bold">{getPhaseLabel(phase)}</Text>
          <Text fontSize="sm" color="gray.500">
            {progressPercent}%
          </Text>
        </HStack>
        <Progress
          value={progressPercent}
          size="lg"
          w="100%"
          colorScheme={phase === 'enriching' ? 'green' : 'blue'}
          borderRadius="md"
          hasStripe
          isAnimated={phase !== 'completed'}
        />
      </Box>

      {/* Status message */}
      {message && (
        <Text fontSize="sm" color="gray.500">
          {message}
        </Text>
      )}

      {/* Connection status indicator */}
      <HStack fontSize="sm" color="gray.500">
        <Box
          w={2}
          h={2}
          borderRadius="full"
          bg={connectionState === 'connected' ? 'green.400' : 'yellow.400'}
        />
        <Text>
          {connectionState === 'connected'
            ? 'Receiving live updates'
            : connectionState === 'connecting'
              ? 'Connecting...'
              : 'Reconnecting...'}
        </Text>
      </HStack>

      {/* Live stats */}
      {stats && stats.total > 0 && (
        <Box w="100%" borderWidth={1} borderRadius="md" p={4} borderColor={borderColor}>
          <Text fontWeight="bold" mb={3}>
            Progress
          </Text>
          <StatGroup>
            <Stat>
              <StatLabel>Pending</StatLabel>
              <StatNumber color="gray.500">{stats.pending}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Processing</StatLabel>
              <StatNumber color="blue.500">{stats.processing}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Completed</StatLabel>
              <StatNumber color="green.500">{stats.completed}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Failed</StatLabel>
              <StatNumber color="red.500">{stats.failed}</StatNumber>
            </Stat>
          </StatGroup>

          <Divider my={3} />

          <HStack justify="space-between" fontSize="sm">
            <Text>Total: {stats.total} items</Text>
            <Text>Skipped: {stats.skipped}</Text>
          </HStack>
        </Box>
      )}

      {/* Failed items preview */}
      {failedItems.length > 0 && (
        <Alert status="warning" borderRadius="md" size="sm">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">{failedItems.length} items failed</Text>
            <Text fontSize="xs" color="gray.600">
              {failedItems.slice(0, 3).map((item) => `MFC#${item.mfcId}`).join(', ')}
              {failedItems.length > 3 && ` +${failedItems.length - 3} more`}
            </Text>
          </Box>
        </Alert>
      )}

      {/* SSE error */}
      {sseError && (
        <Alert status="error" borderRadius="md" size="sm">
          <AlertIcon />
          {sseError.message}
        </Alert>
      )}
    </VStack>
  );

  const renderCompleteStep = () => (
    <VStack spacing={4} align="stretch">
      {syncResult && (
        <>
          <Alert
            status={failedItems.length > 0 ? 'warning' : 'success'}
            borderRadius="md"
          >
            <AlertIcon as={failedItems.length > 0 ? FaExclamationTriangle : FaCheckCircle} />
            <Box>
              <Text fontWeight="bold">Sync Complete</Text>
              <Text fontSize="sm">
                Processed {stats?.completed || syncResult.parsedCount} items
                {stats?.failed && stats.failed > 0 && `, ${stats.failed} failed`}
                {stats?.skipped && stats.skipped > 0 && `, ${stats.skipped} skipped`}
              </Text>
            </Box>
          </Alert>

          {stats && (
            <StatGroup>
              <Stat>
                <StatLabel>Total</StatLabel>
                <StatNumber>{stats.total}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Completed</StatLabel>
                <StatNumber color="green.500">{stats.completed}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Failed</StatLabel>
                <StatNumber color="red.500">{stats.failed}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Skipped</StatLabel>
                <StatNumber color="gray.500">{stats.skipped}</StatNumber>
              </Stat>
            </StatGroup>
          )}

          {failedItems.length > 0 && (
            <>
              <Text fontWeight="bold" color="orange.500">
                Failed Items ({failedItems.length}):
              </Text>
              <Box maxH="150px" overflowY="auto" borderWidth={1} borderRadius="md" p={2}>
                {failedItems.slice(0, 10).map((item, index) => (
                  <Text key={index} fontSize="sm" color="orange.600">
                    MFC#{item.mfcId}: {item.error || 'Unknown error'}
                  </Text>
                ))}
                {failedItems.length > 10 && (
                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    ...and {failedItems.length - 10} more
                  </Text>
                )}
              </Box>
            </>
          )}

          <Alert status="info" borderRadius="md" size="sm">
            <AlertIcon />
            <Text fontSize="sm">
              Completed items have been added to your collection. Refresh the page to see them.
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
            <Button colorScheme="green" onClick={handleStartSync} leftIcon={<Icon as={FaSync} />}>
              Start Sync
            </Button>
          </HStack>
        ) : (
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" leftIcon={<Icon as={FaLock} />} onClick={handleOpenCookiesModal}>
              Update Cookies
            </Button>
            <Button variant="outline" onClick={handleRetryValidation}>
              Retry
            </Button>
          </HStack>
        );
      case 'syncing':
        return (
          <Button
            colorScheme="red"
            variant="outline"
            leftIcon={<Icon as={FaTimes} />}
            onClick={handleCancelSync}
          >
            Cancel Sync
          </Button>
        );
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
