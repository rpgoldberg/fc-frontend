/**
 * MFC Authentication Section Component
 *
 * Extracted from FigureForm.tsx to keep modules under 750 lines.
 * Handles MFC session cookie management for NSFW/private content access.
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Textarea,
  Button,
  Text,
  HStack,
  Badge,
  Tooltip,
  Collapse,
  Code,
  RadioGroup,
  Radio,
  Stack,
  Alert,
  AlertIcon,
  Spinner,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FaLock, FaChevronUp, FaChevronDown, FaQuestionCircle, FaTrash } from 'react-icons/fa';
import { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import Markdown from 'react-markdown';
import { FigureFormData } from '../../types';
import { storeMfcCookies, retrieveMfcCookies, clearMfcCookies, getStorageType, hasMfcCookies } from '../../utils/crypto';

export type StorageType = 'one-time' | 'session' | 'persistent';

interface MfcAuthSectionProps {
  register: UseFormRegister<FigureFormData>;
  setValue: UseFormSetValue<FigureFormData>;
  watch: UseFormWatch<FigureFormData>;
  mfcConfigs: {
    mfc_cookie_instructions?: { value: string };
    mfc_cookie_script?: { value: string };
  };
  isLoadingConfigs: boolean;
}

const MfcAuthSection: React.FC<MfcAuthSectionProps> = ({
  register,
  setValue,
  watch,
  mfcConfigs,
  isLoadingConfigs,
}) => {
  const toast = useToast();
  const [showHelp, setShowHelp] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [storageType, setStorageType] = useState<StorageType>('one-time');
  const [cookiesStored, setCookiesStored] = useState(false);

  // Color mode values
  const boxBg = useColorModeValue('blue.50', 'blue.900');
  const codeBg = useColorModeValue('gray.100', 'gray.700');
  const linkColor = useColorModeValue('blue.500', 'blue.300');
  const helpBoxBg = useColorModeValue('gray.50', 'gray.800');
  const securityTextColor = useColorModeValue('red.600', 'red.400');
  const storageTypeColor = useColorModeValue('blue.600', 'blue.300');

  // Load stored cookies on mount
  useEffect(() => {
    const loadStoredCookies = async () => {
      const storedCookies = await retrieveMfcCookies();
      if (storedCookies) {
        setValue('mfcAuth', storedCookies);
        setCookiesStored(true);
        setStorageType(getStorageType() || 'one-time');
      }
    };
    loadStoredCookies();
  }, [setValue]);

  // Update stored status when mfcAuth changes
  useEffect(() => {
    setCookiesStored(hasMfcCookies());
  }, [watch('mfcAuth')]);

  // Store cookies when value or storage type changes
  const mfcAuth = watch('mfcAuth');
  useEffect(() => {
    if (mfcAuth && storageType !== 'one-time') {
      storeMfcCookies(mfcAuth, storageType);
      setCookiesStored(true);
    }
  }, [mfcAuth, storageType]);

  const handleClearCookies = () => {
    clearMfcCookies();
    setValue('mfcAuth', '');
    setCookiesStored(false);
    setStorageType('one-time');
    toast({
      title: 'Cookies Cleared',
      description: 'MFC cookies have been removed from storage',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg={boxBg}>
      <FormControl>
        <FormLabel>
          <HStack spacing={2}>
            <FaLock />
            <Text>MFC Session Cookies</Text>
            <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
              (Optional - for NSFW/Private content)
            </Text>
            {cookiesStored && (
              <Badge colorScheme="green" fontSize="xs" ml={2}>
                <HStack spacing={1}>
                  <FaLock size={10} />
                  <Text>Stored</Text>
                </HStack>
              </Badge>
            )}
          </HStack>
        </FormLabel>

        <Textarea
          {...register('mfcAuth')}
          placeholder="Paste MFC session cookies here from the bookmarklet below"
          size="sm"
          rows={3}
        />

        {/* Collapsible Help Section - Bookmarklet Only */}
        <Box mt={3}>
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
            <Box mt={2} p={3} bg={helpBoxBg} borderRadius="md">
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

        {/* Collapsible Storage Options */}
        <Box mt={3}>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            Storage Option:
            <Text as="span" ml={2} color={storageTypeColor}>
              {storageType === 'one-time' && 'One-time (cleared when form closes)'}
              {storageType === 'session' && 'Session (cleared on logout)'}
              {storageType === 'persistent' && 'Persistent (encrypted)'}
            </Text>
          </Text>
          <RadioGroup value={storageType} onChange={(value) => setStorageType(value as StorageType)}>
            <Stack direction="column" spacing={2}>
              <Radio value="one-time" size="sm">
                <Tooltip label="Stored in browser memory only - cleared when you close this form">
                  <Text fontSize="sm">One-time use (cleared when form closes)</Text>
                </Tooltip>
              </Radio>
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
        </Box>

        {/* Clear Cookies Button */}
        <HStack mt={3} spacing={2}>
          <Button
            size="sm"
            leftIcon={<FaTrash />}
            colorScheme="red"
            variant="outline"
            onClick={handleClearCookies}
            isDisabled={!cookiesStored}
          >
            Clear MFC Cookies
          </Button>
        </HStack>

        {/* Collapsible Security Section */}
        <Box mt={3}>
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
                  <li>One-time use: Stored in browser memory only—cleared when you close this form</li>
                  <li>Remember for this session: Stored in browser session—cleared when you log out</li>
                  <li>Remember until cleared: Encrypted in browser localStorage—persisted until you manually clear them</li>
                </Text>
                <Text mb={2}>
                  You can always clear stored cookies manually using the "Clear MFC Cookies" button.
                  No cookies are stored if that button is disabled.
                </Text>
                <Text mb={2}>
                  <strong>Note:</strong> Content retrieval is subject to your MFC account's content access
                  permissions. MFC enforces age-restricted content access based on your account settings,
                  ensuring legal compliance.
                </Text>
                <Text fontWeight="bold" color={securityTextColor}>
                  ⚠️ Important: Never share your MFC cookies with anyone—they provide access to your MFC account.
                </Text>
              </Box>
            </Alert>
          </Collapse>
        </Box>
      </FormControl>
    </Box>
  );
};

export default MfcAuthSection;
