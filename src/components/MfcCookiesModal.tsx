/**
 * MFC Cookies Modal Component
 *
 * Centralized modal for managing MFC session cookies.
 * Replaces the scattered cookie management UI from Profile.tsx and FigureForm.
 * Accessible via the padlock icon in the navbar.
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Textarea,
  Button,
  Text,
  HStack,
  VStack,
  Badge,
  Tooltip,
  Collapse,
  Code,
  RadioGroup,
  Radio,
  Stack,
  Alert,
  AlertIcon,
  Box,
  Spinner,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FaLock, FaChevronUp, FaChevronDown, FaQuestionCircle, FaTrash, FaSave } from 'react-icons/fa';
import Markdown from 'react-markdown';
import { usePublicConfigs } from '../hooks/usePublicConfig';
import {
  storeMfcCookies,
  retrieveMfcCookies,
  clearMfcCookies,
  getStorageType,
} from '../utils/crypto';

export type StorageType = 'session' | 'persistent';

interface MfcCookiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCookiesChanged?: () => void; // Callback when cookies are saved/cleared
}

const MfcCookiesModal: React.FC<MfcCookiesModalProps> = ({
  isOpen,
  onClose,
  onCookiesChanged,
}) => {
  const toast = useToast();
  const [mfcAuthCookies, setMfcAuthCookies] = useState('');
  const [storageType, setStorageType] = useState<StorageType>('session');
  const [cookiesStored, setCookiesStored] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch dynamic MFC cookie instructions from backend
  const { configs: mfcConfigs, isLoading: isLoadingConfigs } = usePublicConfigs([
    'mfc_cookie_instructions',
    'mfc_cookie_script',
  ]);

  // Color mode values
  const helpBg = useColorModeValue('gray.50', 'gray.700');
  const codeBg = useColorModeValue('gray.100', 'gray.600');
  const linkColor = useColorModeValue('blue.500', 'blue.300');
  const warningColor = useColorModeValue('red.600', 'red.400');
  const storageTextColor = useColorModeValue('blue.600', 'blue.300');

  // Load stored cookies when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadStoredCookies = async () => {
        const storedCookies = await retrieveMfcCookies();
        if (storedCookies) {
          setMfcAuthCookies(storedCookies);
          setCookiesStored(true);
          const currentType = getStorageType();
          // Only use session or persistent (ignore legacy 'one-time')
          if (currentType === 'session' || currentType === 'persistent') {
            setStorageType(currentType);
          } else {
            setStorageType('session');
          }
        } else {
          setMfcAuthCookies('');
          setCookiesStored(false);
          setStorageType('session');
        }
        setHasChanges(false);
      };
      loadStoredCookies();
    }
  }, [isOpen]);

  const handleCookiesChange = (value: string) => {
    setMfcAuthCookies(value);
    setHasChanges(true);
  };

  const handleStorageTypeChange = (value: StorageType) => {
    setStorageType(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (mfcAuthCookies.trim()) {
      await storeMfcCookies(mfcAuthCookies, storageType);
      setCookiesStored(true);
      setHasChanges(false);
      toast({
        title: 'Cookies Saved',
        description: `MFC cookies stored (${storageType === 'session' ? 'session' : 'persistent'})`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onCookiesChanged?.();
    }
  };

  const handleClear = () => {
    clearMfcCookies();
    setMfcAuthCookies('');
    setCookiesStored(false);
    setStorageType('session');
    setHasChanges(false);
    toast({
      title: 'Cookies Cleared',
      description: 'MFC cookies have been removed from storage',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
    onCookiesChanged?.();
  };

  const handleClose = () => {
    // Reset help/security sections on close
    setShowHelp(false);
    setShowSecurity(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={2}>
            <FaLock />
            <Text>MFC Session Cookies</Text>
            {cookiesStored && (
              <Badge colorScheme="green" fontSize="xs">
                <HStack spacing={1}>
                  <FaLock size={10} />
                  <Text>Stored</Text>
                </HStack>
              </Badge>
            )}
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Description */}
            <Text fontSize="sm" color="gray.500">
              Optional - Required for accessing NSFW/Private content from MyFigureCollection
            </Text>

            {/* Cookie Input */}
            <FormControl>
              <FormLabel fontSize="sm">Session Cookies</FormLabel>
              <Textarea
                value={mfcAuthCookies}
                onChange={(e) => handleCookiesChange(e.target.value)}
                placeholder="Paste MFC session cookies here from the bookmarklet below"
                size="sm"
                rows={4}
              />
            </FormControl>

            {/* Storage Options */}
            <FormControl>
              <FormLabel fontSize="sm">
                Storage Option:
                <Text as="span" ml={2} color={storageTextColor} fontWeight="normal">
                  {storageType === 'session' && '(cleared on logout)'}
                  {storageType === 'persistent' && '(encrypted, persistent)'}
                </Text>
              </FormLabel>
              <RadioGroup value={storageType} onChange={(v) => handleStorageTypeChange(v as StorageType)}>
                <Stack direction="column" spacing={2}>
                  <Radio value="session" size="sm">
                    <Tooltip label="Stored in browser session - cleared when you log out">
                      <Text fontSize="sm">Remember for this session (cleared on logout)</Text>
                    </Tooltip>
                  </Radio>
                  <Radio value="persistent" size="sm">
                    <Tooltip label="Encrypted and stored in browser - persists until manually cleared">
                      <Text fontSize="sm">Remember until cleared (encrypted storage)</Text>
                    </Tooltip>
                  </Radio>
                </Stack>
              </RadioGroup>
            </FormControl>

            {/* Collapsible Help Section */}
            <Box>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowHelp(!showHelp)}
                rightIcon={showHelp ? <FaChevronUp /> : <FaChevronDown />}
                width="full"
                justifyContent="space-between"
              >
                <HStack>
                  <FaQuestionCircle />
                  <Text>How to get MFC cookies</Text>
                </HStack>
              </Button>
              <Collapse in={showHelp} animateOpacity>
                <Box mt={2} p={3} bg={helpBg} borderRadius="md">
                  {isLoadingConfigs ? (
                    <Spinner size="sm" />
                  ) : mfcConfigs.mfc_cookie_instructions?.value || mfcConfigs.mfc_cookie_script?.value ? (
                    <Box fontSize="sm" className="markdown-content" sx={{
                      '& h1, & h2, & h3': { fontWeight: 'bold', mt: 2, mb: 1 },
                      '& h1': { fontSize: 'lg' },
                      '& h2': { fontSize: 'md' },
                      '& p': { mb: 2 },
                      '& ul, & ol': { pl: 4, mb: 2 },
                      '& li': { mb: 1 },
                      '& code': { bg: codeBg, px: 1, borderRadius: 'sm', fontSize: 'xs' },
                      '& pre': { bg: codeBg, p: 2, borderRadius: 'md', overflowX: 'auto', fontSize: 'xs' },
                      '& a': { color: linkColor, textDecoration: 'underline' },
                      '& strong': { fontWeight: 'bold' },
                      '& table': { width: '100%', mb: 2 },
                      '& th, & td': { border: '1px solid', borderColor: 'gray.300', p: 2, textAlign: 'left' },
                    }}>
                      {mfcConfigs.mfc_cookie_instructions?.value && (
                        <Markdown>{mfcConfigs.mfc_cookie_instructions.value}</Markdown>
                      )}
                      {mfcConfigs.mfc_cookie_script?.value && (
                        <Code fontSize="xs" p={2} display="block" whiteSpace="pre-wrap" mt={2}>
                          {mfcConfigs.mfc_cookie_script.value}
                        </Code>
                      )}
                    </Box>
                  ) : (
                    <Text fontSize="sm" color="gray.500">
                      Instructions not available. Please contact an administrator.
                    </Text>
                  )}
                </Box>
              </Collapse>
            </Box>

            {/* Collapsible Security Section */}
            <Box>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSecurity(!showSecurity)}
                rightIcon={showSecurity ? <FaChevronUp /> : <FaChevronDown />}
                width="full"
                justifyContent="space-between"
              >
                <HStack>
                  <FaLock />
                  <Text>Security & Privacy</Text>
                </HStack>
              </Button>
              <Collapse in={showSecurity} animateOpacity>
                <Alert status="info" mt={2} borderRadius="md">
                  <AlertIcon />
                  <Box fontSize="xs">
                    <Text fontWeight="bold" mb={2}>🔒 Security & Privacy</Text>
                    <Text mb={2}>
                      When provided, MFC cookies are encrypted and stored only in your browser's localStorage.
                      They are securely transmitted to our services when scraping, as MFC requires your
                      authenticated session to authorize your access to:
                    </Text>
                    <Text as="ul" pl={4} mb={2}>
                      <li>NSFW/NSFW+ restricted content</li>
                      <li>Your MFC Manager catalog (for bulk import/sync)</li>
                      <li>Other authorized private or restricted items on MFC</li>
                    </Text>
                    <Text mb={2}>
                      <strong>Our services immediately discard your cookies after retrieving the data</strong>—they
                      are never stored on our servers. All services are open source for full transparency.
                    </Text>
                    <Text fontWeight="medium" mb={1}>Browser Storage Options:</Text>
                    <Text fontSize="sm" mb={2} fontStyle="italic">
                      (These options control how your cookies are stored <em>in your browser</em>, not on our servers)
                    </Text>
                    <Text as="ul" pl={4} mb={2}>
                      <li>Remember for this session: Stored in browser session—cleared when you log out</li>
                      <li>Remember until cleared: Encrypted in browser localStorage—persisted until you manually clear them</li>
                    </Text>
                    <Text mb={2}>
                      You can always clear stored cookies using the navbar padlock menu or the button below.
                    </Text>
                    <Text fontWeight="bold" color={warningColor}>
                      ⚠️ Important: Never share your MFC cookies with anyone—they provide access to your MFC account.
                    </Text>
                  </Box>
                </Alert>
              </Collapse>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button
              size="sm"
              leftIcon={<FaTrash />}
              colorScheme="red"
              variant="outline"
              onClick={handleClear}
              isDisabled={!cookiesStored && !mfcAuthCookies.trim()}
            >
              Clear Cookies
            </Button>
            <Button
              size="sm"
              leftIcon={<FaSave />}
              colorScheme="blue"
              onClick={handleSave}
              isDisabled={!mfcAuthCookies.trim() || !hasChanges}
            >
              Save
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default MfcCookiesModal;
