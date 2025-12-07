/**
 * MFC Account Sync Modal
 *
 * Multi-step wizard for syncing collection from MyFigureCollection.net using session cookies.
 * Connects to the scraper service for automated CSV export and processing.
 *
 * Steps:
 * 1. Cookie Input - User provides MFC session cookies
 * 2. Validation - Validates cookies and shows MFC username
 * 3. Syncing - Shows sync progress and queue status
 * 4. Complete - Summary of synced items
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Textarea,
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
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Divider,
  Icon,
  Tooltip,
  Code,
  Collapse,
  Link,
  Spinner,
} from '@chakra-ui/react';
import {
  FaSync,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCookie,
  FaKey,
  FaUser,
  FaInfoCircle,
  FaExternalLinkAlt,
} from 'react-icons/fa';
import {
  validateMfcCookies,
  executeFullSync,
  getQueueStats,
} from '../api/scraper';
import { useAuthStore } from '../stores/authStore';
import { MfcCookies, MfcCookieValidationResult, MfcSyncResult, MfcQueueStats } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('MFC_SYNC');

interface MfcSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
}

type SyncStep = 'cookies' | 'validating' | 'syncing' | 'complete';

const MfcSyncModal: React.FC<MfcSyncModalProps> = ({ isOpen, onClose, onSyncComplete }) => {
  const [step, setStep] = useState<SyncStep>('cookies');
  const [cookies, setCookies] = useState<MfcCookies>({
    PHPSESSID: '',
    sesUID: '',
    sesDID: '',
  });
  const [rawCookieInput, setRawCookieInput] = useState('');
  const [validationResult, setValidationResult] = useState<MfcCookieValidationResult | null>(null);
  const [syncResult, setSyncResult] = useState<MfcSyncResult | null>(null);
  const [queueStats, setQueueStats] = useState<MfcQueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast();
  const { user } = useAuthStore();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const helpBgColor = useColorModeValue('gray.50', 'gray.700');

  // Parse cookies from raw input (supports various formats)
  const parseCookiesFromInput = useCallback((input: string): Partial<MfcCookies> => {
    const parsed: Partial<MfcCookies> = {};

    // Try to extract cookies from various formats:
    // 1. JSON object: {"PHPSESSID": "...", "sesUID": "...", "sesDID": "..."}
    // 2. Cookie header: PHPSESSID=...; sesUID=...; sesDID=...
    // 3. Key=value pairs on separate lines

    try {
      // Try JSON first
      const jsonParsed = JSON.parse(input);
      if (jsonParsed.PHPSESSID) parsed.PHPSESSID = jsonParsed.PHPSESSID;
      if (jsonParsed.sesUID) parsed.sesUID = jsonParsed.sesUID;
      if (jsonParsed.sesDID) parsed.sesDID = jsonParsed.sesDID;
      return parsed;
    } catch {
      // Not JSON, try other formats
    }

    // Try cookie header format or key=value pairs
    const patterns = {
      PHPSESSID: /PHPSESSID[=:]\s*["']?([a-zA-Z0-9]+)["']?/i,
      sesUID: /sesUID[=:]\s*["']?(\d+)["']?/i,
      sesDID: /sesDID[=:]\s*["']?(\d+)["']?/i,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = input.match(pattern);
      if (match) {
        parsed[key as keyof MfcCookies] = match[1];
      }
    }

    return parsed;
  }, []);

  // Update cookies when raw input changes
  useEffect(() => {
    if (rawCookieInput) {
      const parsed = parseCookiesFromInput(rawCookieInput);
      setCookies((prev) => ({
        PHPSESSID: parsed.PHPSESSID || prev.PHPSESSID,
        sesUID: parsed.sesUID || prev.sesUID,
        sesDID: parsed.sesDID || prev.sesDID,
      }));
    }
  }, [rawCookieInput, parseCookiesFromInput]);

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

  const handleValidateCookies = async () => {
    setError(null);
    setIsLoading(true);
    setStep('validating');

    try {
      const result = await validateMfcCookies(cookies);
      setValidationResult(result);

      if (result.valid) {
        logger.info('Cookies validated successfully:', result.username);
        toast({
          title: 'Cookies validated',
          description: `Connected as ${result.username}`,
          status: 'success',
          duration: 3000,
        });
      } else {
        setError(result.error || 'Invalid cookies');
        setStep('cookies');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Validation failed';
      setError(message);
      setStep('cookies');
      logger.error('Cookie validation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSync = async () => {
    if (!user?._id || !validationResult?.valid) return;

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

  const handleClose = () => {
    setStep('cookies');
    setCookies({ PHPSESSID: '', sesUID: '', sesDID: '' });
    setRawCookieInput('');
    setValidationResult(null);
    setSyncResult(null);
    setQueueStats(null);
    setError(null);
    onClose();
  };

  const isValidCookies = cookies.PHPSESSID && cookies.sesUID && cookies.sesDID;

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderCookieStep = () => (
    <VStack spacing={4} align="stretch">
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Connect your MFC account</Text>
          <Text fontSize="sm">
            Paste your MFC session cookies to sync your collection automatically.
          </Text>
        </Box>
      </Alert>

      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}

      <FormControl>
        <FormLabel>
          <HStack>
            <Icon as={FaCookie} />
            <Text>Paste Cookies</Text>
            <Tooltip label="Click for instructions">
              <Icon
                as={FaInfoCircle}
                color="blue.500"
                cursor="pointer"
                onClick={() => setShowHelp(!showHelp)}
              />
            </Tooltip>
          </HStack>
        </FormLabel>
        <Textarea
          placeholder='{"PHPSESSID": "abc123...", "sesUID": "12345", "sesDID": "67890"}'
          value={rawCookieInput}
          onChange={(e) => setRawCookieInput(e.target.value)}
          minH="100px"
          fontFamily="mono"
          fontSize="sm"
        />
        <FormHelperText>
          Paste your cookies in JSON format or as a cookie header string.
        </FormHelperText>
      </FormControl>

      <Collapse in={showHelp}>
        <Box bg={helpBgColor} p={4} borderRadius="md" fontSize="sm">
          <Text fontWeight="bold" mb={2}>How to get your MFC cookies:</Text>
          <VStack align="start" spacing={2}>
            <Text>1. Log in to <Link href="https://myfigurecollection.net" isExternal color="blue.500">MyFigureCollection.net <Icon as={FaExternalLinkAlt} boxSize={3} /></Link></Text>
            <Text>2. Open browser Developer Tools (F12 or Ctrl+Shift+I)</Text>
            <Text>3. Go to Application tab → Cookies → myfigurecollection.net</Text>
            <Text>4. Copy these cookie values:</Text>
            <Code p={2} borderRadius="md">PHPSESSID, sesUID, sesDID</Code>
            <Text>5. Paste them in any format above</Text>
          </VStack>
          <Alert status="warning" size="sm" mt={3} borderRadius="md">
            <AlertIcon />
            <Text fontSize="xs">
              Never share your cookies with anyone. They provide access to your MFC account.
            </Text>
          </Alert>
        </Box>
      </Collapse>

      <Divider />

      <Text fontWeight="bold" fontSize="sm">Or enter cookies manually:</Text>

      <HStack spacing={4}>
        <FormControl>
          <FormLabel fontSize="sm">PHPSESSID</FormLabel>
          <Input
            placeholder="abc123..."
            value={cookies.PHPSESSID}
            onChange={(e) => setCookies((c) => ({ ...c, PHPSESSID: e.target.value }))}
            fontFamily="mono"
            fontSize="sm"
          />
        </FormControl>
      </HStack>

      <HStack spacing={4}>
        <FormControl>
          <FormLabel fontSize="sm">sesUID</FormLabel>
          <Input
            placeholder="12345"
            value={cookies.sesUID}
            onChange={(e) => setCookies((c) => ({ ...c, sesUID: e.target.value }))}
            fontFamily="mono"
            fontSize="sm"
          />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">sesDID</FormLabel>
          <Input
            placeholder="67890"
            value={cookies.sesDID}
            onChange={(e) => setCookies((c) => ({ ...c, sesDID: e.target.value }))}
            fontFamily="mono"
            fontSize="sm"
          />
        </FormControl>
      </HStack>

      {isValidCookies && (
        <Alert status="success" borderRadius="md" size="sm">
          <AlertIcon />
          All required cookies detected
        </Alert>
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
              <Badge colorScheme="green" fontSize="md">{validationResult.username}</Badge>
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
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Validation failed</Text>
            <Text fontSize="sm">{error || 'Invalid or expired cookies'}</Text>
          </Box>
        </Alert>
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
                {syncResult.errors.slice(0, 10).map((error, index) => (
                  <Text key={index} fontSize="sm" color="orange.600">
                    {error}
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
      case 'cookies':
        return renderCookieStep();
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
      case 'cookies':
        return (
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleValidateCookies}
              isDisabled={!isValidCookies}
              leftIcon={<Icon as={FaKey} />}
            >
              Validate Cookies
            </Button>
          </HStack>
        );
      case 'validating':
        return isLoading ? null : validationResult?.valid ? (
          <HStack spacing={3}>
            <Button variant="ghost" onClick={() => setStep('cookies')}>
              Back
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
          <Button variant="ghost" onClick={() => setStep('cookies')}>
            Back
          </Button>
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
      case 'cookies':
        return 'Connect MFC Account';
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
      <ModalContent bg={bgColor}>
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
