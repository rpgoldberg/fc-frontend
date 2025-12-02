import React, { useState, useEffect, useRef, useCallback } from 'react';
import Markdown from 'react-markdown';
import { createLogger } from '../utils/logger';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  FormErrorMessage,
  VStack,
  Grid,
  GridItem,
  InputGroup,
  InputRightElement,
  IconButton,
  Tooltip,
  Text,
  useToast,
  Spinner,
  Image,
  useColorModeValue,
  Collapse,
  Radio,
  RadioGroup,
  Stack,
  Code,
  HStack,
  Alert,
  AlertIcon,
  Badge,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { FaLink, FaQuestionCircle, FaImage, FaChevronDown, FaChevronUp, FaLock, FaTrash } from 'react-icons/fa';
import {
  storeMfcCookies,
  retrieveMfcCookies,
  clearMfcCookies,
  getStorageType,
  hasMfcCookies,
  type StorageType,
} from '../utils/crypto';
import { Figure, FigureFormData } from '../types';
import { usePublicConfigs } from '../hooks/usePublicConfig';


type SubmitAction = 'save' | 'saveAndAdd' | null;

interface FigureFormProps {
  initialData?: Figure;
  onSubmit: (data: FigureFormData, addAnother?: boolean) => void;
  isLoading: boolean;
  loadingAction?: SubmitAction;  // Which button triggered the loading state
  onResetComplete?: () => void;  // Callback when form reset is complete (for Save & Add Another)
}

const logger = createLogger('FIGURE_FORM');

const FigureForm: React.FC<FigureFormProps> = ({ initialData, onSubmit, isLoading, loadingAction, onResetComplete }) => {
  const [isScrapingMFC, setIsScrapingMFC] = useState(false);
  const [imageError, setImageError] = useState(false);

  // MFC Cookie storage state
  const [storageType, setStorageType] = useState<StorageType>(() => {
    // Check if cookies are already stored and preserve their storage type
    const existingType = getStorageType();
    return existingType || 'one-time';
  });
  const [showHelp, setShowHelp] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [cookiesStored, setCookiesStored] = useState(hasMfcCookies());
  const [pendingAction, setPendingAction] = useState<SubmitAction>(null);

  // Fetch dynamic MFC cookie instructions and script from backend
  const { configs: mfcConfigs, isLoading: isLoadingConfigs } = usePublicConfigs([
    'mfc_cookie_script',
    'mfc_cookie_instructions'
  ]);

  const previewBorderColor = useColorModeValue('gray.200', 'gray.600');
  const previewBg = useColorModeValue('gray.50', 'gray.700');
  const codeBg = useColorModeValue('gray.100', 'gray.700');
  const linkColor = useColorModeValue('blue.500', 'blue.300');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
    reset,
  } = useForm<FigureFormData>({
    defaultValues: initialData || {
      manufacturer: '',
      name: '',
      scale: '',
      mfcLink: '',
      mfcAuth: '',
      location: '',
      boxNumber: '',
      imageUrl: '',
    },
  });

  const toast = useToast();
  const mfcLink = watch('mfcLink');
  const imageUrl = watch('imageUrl');

  // Optimized refs for stable references and operation management
  const previousMfcLink = useRef<string>('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentScrapeController = useRef<AbortController | null>(null);
  const isScrapingRef = useRef(false);
  const lastScrapePromise = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);

  // Debug: Log every render to see what's happening (commented out to reduce noise)
  // console.log('[FRONTEND DEBUG] Component render, mfcLink:', mfcLink);

  const openMfcLink = () => {
    if (mfcLink) {
      window.open(mfcLink, '_blank');
    }
  };

  const openImageLink = () => {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };

  const validateUrl = (value: string | undefined) => {
    console.log('Validating URL:', value);
    if (!value) return true;
    
    try {
      const url = new URL(value);
      console.log('URL Details:', {
        protocol: url.protocol,
        hostname: url.hostname,
        pathname: url.pathname,
        search: url.search
      });
      // More rigorous checks
      if (!['http:', 'https:'].includes(url.protocol)) {
        console.log('Invalid protocol');
        return 'URL must use http or https';
      }
      // Ensure the URL has a domain with at least two parts
      const hostParts = url.hostname.split('.');
      if (hostParts.length < 2 || hostParts.some(part => part.length === 0)) {
        console.log('Invalid domain');
        return 'Please enter a valid URL with a domain';
      }
      return true;
    } catch (e) {
      console.log('URL validation error:', e);
      return 'Please enter a valid URL';
    }
  };

  const validateMfcUrl = (value: string | undefined) => {
    if (!value) return true;

    // First check if it's a valid URL
    const urlValidation = validateUrl(value);
    if (urlValidation !== true) return urlValidation;

    // Accept http/https and optional trailing slash or minor path/query fragments after the numeric id
    const mfcPattern = /^https?:\/\/(?:www\.)?myfigurecollection\.net\/item\/\d+(?:\/.*)?$/i;
    if (!mfcPattern.test(value)) {
      return 'Please enter a valid MFC URL like https://myfigurecollection.net/item/123456';
    }

    return true;
  };

  // Conditional validation for name and manufacturer based on mfcLink presence
  const validateName = (value: string | undefined) => {
    const mfcLinkValue = getValues('mfcLink');
    if (mfcLinkValue && mfcLinkValue.trim()) {
      // If MFC link is present, name can be empty (will be populated from scraping)
      return true;
    }
    // Otherwise, name is required
    if (!value || !value.trim()) {
      return 'Figure name is required';
    }
    return true;
  };

  const validateManufacturer = (value: string | undefined) => {
    const mfcLinkValue = getValues('mfcLink');
    if (mfcLinkValue && mfcLinkValue.trim()) {
      // If MFC link is present, manufacturer can be empty (will be populated from scraping)
      return true;
    }
    // Otherwise, manufacturer is required
    if (!value || !value.trim()) {
      return 'Manufacturer is required';
    }
    return true;
  };
  const formatScale = (input: string) => {
    // Convert to fraction format (e.g., 1/8, 1/7, etc.)
    if (!input.includes('/')) {
      const num = parseFloat(input);
      if (!isNaN(num) && num > 0 && num <= 1) {
        return `1/${Math.round(1 / num)}`;
      }
      // Preserve non-numeric inputs like 'Nendoroid'
      if (isNaN(num)) {
        return input;
      }
    }
    return input;
  };

  const handleScaleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const formattedScale = formatScale(e.target.value);
    setValue('scale', formattedScale);
  };

  // Optimized function to scrape MFC data with proper async queuing and cleanup
  const handleMFCLinkBlur = useCallback(async (targetMfcLink?: string) => {
    const currentMfcLink = targetMfcLink || getValues('mfcLink');
    if (!currentMfcLink?.trim()) return;

    const mfcPattern = /^https?:\/\/(?:www\.)?myfigurecollection\.net\/item\/\d+(?:\/.*)?$/i;
    if (!mfcPattern.test(currentMfcLink)) return;

    if (currentScrapeController.current) {
      currentScrapeController.current.abort();
    }

    if (isScrapingRef.current && lastScrapePromise.current) {
      try { await lastScrapePromise.current; } catch {}
    }

    setIsScrapingMFC(true);
    isScrapingRef.current = true;

    const controller = new AbortController();
    currentScrapeController.current = controller;

    const scrapePromise = (async () => {
      try {
        const currentMfcAuth = getValues('mfcAuth');
        const requestBody = {
          mfcLink: currentMfcLink,
          ...(currentMfcAuth && { mfcAuth: currentMfcAuth })
        };
        console.log('[FRONTEND] Making request to /api/figures/scrape-mfc with body:', requestBody);

        const response = await fetch('/api/figures/scrape-mfc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        if (controller.signal.aborted) return;
        const result = await response.json();
        
        if (!response.ok) {
          if (mountedRef.current) {
            toast({
              title: 'Error',
              description: result.message || 'Failed to scrape MFC data',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          }
          return;
        }

        if (result.success && result.data) {
          let fieldsPopulated = 0;
          const currentValues = getValues();
          
          if (!currentValues.imageUrl && result.data.imageUrl) {
            setValue('imageUrl', result.data.imageUrl, { shouldValidate: true, shouldDirty: true });
            fieldsPopulated++;
          }
          if (!currentValues.manufacturer && result.data.manufacturer) {
            setValue('manufacturer', result.data.manufacturer, { shouldValidate: true, shouldDirty: true });
            fieldsPopulated++;
          }
          if (!currentValues.name && result.data.name) {
            setValue('name', result.data.name, { shouldValidate: true, shouldDirty: true });
            fieldsPopulated++;
          }
          if (!currentValues.scale && result.data.scale) {
            setValue('scale', result.data.scale, { shouldValidate: true, shouldDirty: true });
            fieldsPopulated++;
          }

          if (mountedRef.current) {
            toast({
              title: fieldsPopulated > 0 ? 'Success' : 'Info',
              description: fieldsPopulated > 0
                ? `Auto-populated ${fieldsPopulated} fields from MFC!`
                : 'No new data found to populate (fields may already be filled)',
              status: fieldsPopulated > 0 ? 'success' : 'info',
              duration: 3000,
              isClosable: true,
            });
          }
        } else if (mountedRef.current) {
          toast({
            title: 'Warning',
            description: 'No data could be extracted from MFC link',
            status: 'warning',
            duration: 3000,
            isClosable: true,
          });
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        if (mountedRef.current) {
          toast({
            title: 'Error',
            description: 'Network error while contacting server',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      } finally {
        if (mountedRef.current) {
          setIsScrapingMFC(false);
        }
        isScrapingRef.current = false;
        if (currentScrapeController.current === controller) {
          currentScrapeController.current = null;
        }
      }
    })();

    lastScrapePromise.current = scrapePromise;
    return scrapePromise;
  }, [getValues, setValue, toast]);

  // Optimized useEffect for MFC link changes with stable dependencies
  useEffect(() => {
    const currentMfcLink = mfcLink || '';

    // Skip if no actual change
    if (currentMfcLink === previousMfcLink.current) {
      return;
    }


    // Clear any existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }

    // Only trigger if the link is valid and non-empty
    const mfcPattern = /^https?:\/\/(?:www\.)?myfigurecollection\.net\/item\/\d+(?:\/.*)?$/i;
    if (typeof currentMfcLink === 'string' && currentMfcLink.trim() && mfcPattern.test(currentMfcLink)) {

      // Use optimized debounce with stable timer management
      debounceTimer.current = setTimeout(async () => {
        logger.verbose('Debounce timer executed');
        // Capture current values to avoid stale closure
        const linkToScrape = currentMfcLink;
        const currentFormValues = getValues();

        // Only proceed if the link hasn't changed since timer was set
        if (linkToScrape === currentFormValues.mfcLink) {
          logger.verbose('Link unchanged, calling handleMFCLinkBlur');
          await handleMFCLinkBlur(linkToScrape);
        } else {
          logger.verbose('Link changed during debounce, skipping scrape');
        }
        debounceTimer.current = null;
      }, 1000);
    }

    previousMfcLink.current = currentMfcLink;

    // Cleanup function
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [mfcLink, handleMFCLinkBlur, getValues]); // Include dependencies for stable behavior

  // Reset image error when imageUrl changes
  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    } else {
      reset({
        manufacturer: '',
        name: '',
        scale: '',
        mfcLink: '',
        mfcAuth: '',
        location: '',
        boxNumber: '',
        imageUrl: '',
      });
    }
  }, [initialData, reset]);

  // Load stored MFC cookies on mount
  useEffect(() => {
    const loadStoredCookies = async () => {
      const storedCookies = await retrieveMfcCookies();
      if (storedCookies) {
        setValue('mfcAuth', storedCookies);
        setCookiesStored(true);
      } else {
        setCookiesStored(false);
      }
    };

    loadStoredCookies();
  }, [setValue]);

  // Watch mfcAuth field and save when storage type changes
  const mfcAuth = watch('mfcAuth');
  useEffect(() => {
    const saveCookies = async () => {
      if (mfcAuth) {
        await storeMfcCookies(mfcAuth, storageType);
        setCookiesStored(true);
      } else {
        clearMfcCookies();
        setCookiesStored(false);
      }
    };

    saveCookies();
  }, [mfcAuth, storageType]);

  // Cleanup effect for component unmount and pending operations
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cancel any pending scrape operations
      if (currentScrapeController.current) {
        currentScrapeController.current.abort();
      }

      // Clear any pending debounce timers
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Reset refs
      isScrapingRef.current = false;
      currentScrapeController.current = null;
      debounceTimer.current = null;
      lastScrapePromise.current = null;

      // Clear one-time cookies when component unmounts
      if (storageType === 'one-time') {
        clearMfcCookies();
      }
    };
  }, [storageType]);

  // Handle form submission - delegates to parent with addAnother flag
  const handleFormSubmit = (data: FigureFormData) => {
    const isAddAnother = pendingAction === 'saveAndAdd';
    // Pass the addAnother flag to parent so it can decide whether to navigate
    onSubmit(data, isAddAnother);
  };

  // Reset form for "Save & Add Another" - called by parent after successful save
  const resetFormForAddAnother = useCallback(() => {
    // Reset form fields but preserve MFC cookies
    const currentMfcAuth = getValues('mfcAuth');
    reset({
      manufacturer: '',
      name: '',
      scale: '',
      mfcLink: '',
      mfcAuth: currentMfcAuth, // Preserve MFC auth cookies
      location: '',
      boxNumber: '',
      imageUrl: '',
    });
    // Reset pending action
    setPendingAction(null);
    // Notify parent that reset is complete
    onResetComplete?.();
  }, [getValues, reset, onResetComplete]);

  // Effect to reset form when parent signals success for "Save & Add Another"
  useEffect(() => {
    // When loading finishes after a saveAndAdd action, reset the form
    if (!isLoading && loadingAction === 'saveAndAdd' && pendingAction === 'saveAndAdd') {
      resetFormForAddAnother();
    }
  }, [isLoading, loadingAction, pendingAction, resetFormForAddAnother]);

  return (
    <Box as="form" onSubmit={handleSubmit(handleFormSubmit)} role="form" aria-labelledby="figure-form-title">
      <VStack spacing={6} align="stretch">
        <Text id="figure-form-title" fontSize="xl" fontWeight="bold" className="sr-only">
          {initialData ? 'Edit Figure Form' : 'Add Figure Form'}
        </Text>
        <Text fontSize="sm" color="gray.600" mb={4} aria-describedby="form-instructions">
          Fill out the form below to {initialData ? 'update' : 'add'} a figure to your collection.
          {mfcLink ? ' The form will auto-populate data from the MFC link.' : ''}
        </Text>
        <Text id="form-instructions" className="sr-only">
          Required fields are marked with an asterisk. You can provide an MFC link to auto-populate figure data.
        </Text>
        {/* MFC Link at top - full width */}
        <FormControl isInvalid={!!errors.mfcLink}>
          <FormLabel>MyFigureCollection Link</FormLabel>
          <InputGroup>
            <Input
              {...register('mfcLink', {
                validate: validateMfcUrl
              })}
              placeholder="https://myfigurecollection.net/item/123456"
              data-invalid={!!errors.mfcLink}
            />
            <InputRightElement>
       {isScrapingMFC ? (
                <Spinner size="sm" data-testid="mfc-scraping-spinner" />
       ) : (
                <IconButton
                  aria-label="Open MFC link"
                  icon={<FaLink />}
                  size="sm"
                  variant="ghost"
                  onClick={openMfcLink}
                  isDisabled={!mfcLink}
                />
	      )}
            </InputRightElement>
          </InputGroup>
          <FormErrorMessage data-testid="form-error-message">{errors.mfcLink?.message}</FormErrorMessage>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Click the link icon to open MFC page, then manually copy data if auto-population fails
          </Text>
        </FormControl>

        {/* MFC Authentication - Comprehensive Cookie Management */}
        <Box borderWidth="1px" borderRadius="lg" p={4} bg={useColorModeValue('blue.50', 'blue.900')}>
          <FormControl>
            <FormLabel>
              <HStack spacing={2}>
                <FaLock />
                <Text>MFC Session Cookies</Text>
                <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>(Optional - for NSFW/Private content)</Text>
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
                <Box mt={2} p={3} bg={useColorModeValue('gray.50', 'gray.800')} borderRadius="md">
                  {isLoadingConfigs ? (
                    <Spinner size="sm" />
                  ) : mfcConfigs.mfc_cookie_instructions?.value || mfcConfigs.mfc_cookie_script?.value ? (
                    // Dynamic content from admin config - rendered as markdown
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
                <Text as="span" ml={2} color={useColorModeValue('blue.600', 'blue.300')}>
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
                onClick={() => {
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
                }}
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
                    <Text fontWeight="bold" color={useColorModeValue('red.600', 'red.400')}>
                      ⚠️ Important: Never share your MFC cookies with anyone—they provide access to your MFC account.
                    </Text>
                  </Box>
                </Alert>
              </Collapse>
            </Box>
          </FormControl>
        </Box>

        <Grid templateColumns={{ base: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' }} gap={6}>
          <GridItem>
            <FormControl isInvalid={!!errors.manufacturer}>
              <FormLabel>
                Manufacturer
                {!mfcLink && <Text as="span" color="red.500" ml={1} aria-label="required">*</Text>}
              </FormLabel>
              <Input
                {...register('manufacturer', { validate: validateManufacturer })}
                placeholder="e.g., Good Smile Company"
                aria-describedby={errors.manufacturer ? "manufacturer-error" : undefined}
              />
              <FormErrorMessage id="manufacturer-error" data-testid="form-error-message">{errors.manufacturer?.message}</FormErrorMessage>
            </FormControl>
          </GridItem>

          <GridItem>
            <FormControl isInvalid={!!errors.name}>
              <FormLabel>
                Figure Name
                {!mfcLink && <Text as="span" color="red.500" ml={1} aria-label="required">*</Text>}
              </FormLabel>
              <Input
                {...register('name', { validate: validateName })}
                placeholder="e.g., Nendoroid Miku Hatsune"
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              <FormErrorMessage id="name-error" data-testid="form-error-message">{errors.name?.message}</FormErrorMessage>
            </FormControl>
          </GridItem>

          <GridItem>
            <FormControl isInvalid={!!errors.scale}>
              <FormLabel>
                Scale
                <Tooltip label="Common scales: 1/8, 1/7, 1/6 for scale figures, or enter 'Nendoroid', 'Figma', etc.">
                  <IconButton
                    aria-label="Scale info"
                    icon={<FaQuestionCircle />}
                    size="xs"
                    variant="ghost"
                    ml={1}
                  />
                </Tooltip>
              </FormLabel>
              <Input
                {...register('scale')} //optional
                placeholder="e.g., 1/8, 1/7, Nendoroid"
                onBlur={handleScaleBlur}
              />
              <FormErrorMessage>{errors.scale?.message}</FormErrorMessage>
            </FormControl>
          </GridItem>

          <GridItem>
            <FormControl isInvalid={!!errors.location}>
              <FormLabel>Storage Location</FormLabel>
              <Input
                {...register('location')} //optional
                placeholder="e.g., Shelf, Display Case, Storage Room"
              />
              <FormErrorMessage>{errors.location?.message}</FormErrorMessage>
            </FormControl>
          </GridItem>

          <GridItem>
            <FormControl isInvalid={!!errors.boxNumber}>
              <FormLabel>Box Number/ID</FormLabel>
              <Input
                {...register('boxNumber')} //optional
                placeholder="e.g., A1, Box 3"
              />
              <FormErrorMessage>{errors.boxNumber?.message}</FormErrorMessage>
            </FormControl>
          </GridItem>

          <GridItem colSpan={{ base: 1, md: 2 }}>
            <FormControl isInvalid={!!errors.imageUrl}>
              <FormLabel>Image URL (Optional)</FormLabel>
              <InputGroup>
                <Input
                  {...register('imageUrl', {
                    validate: validateUrl,
                  })}
                  placeholder="https://example.com/image.jpg"
                />
                <InputRightElement>
                  <IconButton
                    aria-label="Open image link"
                    icon={<FaImage />}
                    size="sm"
                    variant="ghost"
                    onClick={openImageLink}
                    isDisabled={!imageUrl}
                  />
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.imageUrl?.message}</FormErrorMessage>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Leave blank to auto-fetch from MFC
              </Text>
              {imageUrl && (
                <Box mt={4} p={4} border="1px" borderColor={previewBorderColor} borderRadius="md">
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>Image Preview:</Text>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    maxH="300px"
                    bg={previewBg}
                    borderRadius="md"
                    overflow="hidden"
                  >
                    {imageError ? (
                      <Text color="gray.500">Failed to load image</Text>
                    ) : (
                      <Image
                        src={imageUrl}
                        alt="Figure preview"
                        maxH="100%"
                        maxW="100%"
                        objectFit="contain"
                        onError={() => setImageError(true)}
                      />
                    )}
                  </Box>
                </Box>
              )}
            </FormControl>
          </GridItem>
        </Grid>

        <HStack mt={4} spacing={4}>
          <Button
            colorScheme="brand"
            isLoading={isLoading && (loadingAction === 'save' || pendingAction === 'save')}
            type="submit"
            size="lg"
            onClick={() => setPendingAction('save')}
            isDisabled={isLoading}
          >
            {initialData ? 'Update Figure' : 'Add Figure'}
          </Button>

          {!initialData && (
            <Button
              colorScheme="green"
              isLoading={isLoading && (loadingAction === 'saveAndAdd' || pendingAction === 'saveAndAdd')}
              type="submit"
              size="lg"
              onClick={() => setPendingAction('saveAndAdd')}
              isDisabled={isLoading}
            >
              Save & Add Another
            </Button>
          )}
        </HStack>
      </VStack>
    </Box>
  );
};

export default FigureForm;
