import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createLogger } from '../../utils/logger';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  VStack,
  InputGroup,
  InputRightElement,
  IconButton,
  Text,
  useToast,
  Spinner,
  HStack,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { FaLink } from 'react-icons/fa';
import CoreFieldsSection from './CoreFieldsSection';
import CollectionDetailsSection from './CollectionDetailsSection';
import CatalogPurchaseSection from './CatalogPurchaseSection';
import { Figure, FigureFormData, CollectionStatus } from '../../types';
import { retrieveMfcCookies } from '../../utils/crypto';


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
  const [pendingAction, setPendingAction] = useState<SubmitAction>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
    reset,
  } = useForm<FigureFormData>({
    defaultValues: initialData ? {
      ...initialData,
      // Map nested Figure fields to flat form fields
      releaseDate: initialData.releases?.[0]?.date || '',
      releasePrice: initialData.releases?.[0]?.price,
      releaseCurrency: initialData.releases?.[0]?.currency || 'JPY',
      heightMm: initialData.dimensions?.heightMm,
      widthMm: initialData.dimensions?.widthMm,
      depthMm: initialData.dimensions?.depthMm,
      purchaseDate: initialData.purchaseInfo?.date || '',
      purchasePrice: initialData.purchaseInfo?.price,
      purchaseCurrency: initialData.purchaseInfo?.currency || 'USD',
      merchantName: initialData.merchant?.name || '',
      merchantUrl: initialData.merchant?.url || '',
    } : {
      manufacturer: '',
      name: '',
      scale: '',
      mfcLink: '',
      mfcAuth: '',
      location: '',
      storageDetail: '',
      imageUrl: '',
      // Schema v3.0 defaults
      jan: '',
      collectionStatus: 'owned' as CollectionStatus,
      releaseDate: '',
      releasePrice: undefined,
      releaseCurrency: 'JPY',
      heightMm: undefined,
      widthMm: undefined,
      depthMm: undefined,
      purchaseDate: '',
      purchasePrice: undefined,
      purchaseCurrency: 'USD',
      merchantName: '',
      merchantUrl: '',
      rating: undefined,
      wishRating: undefined,
      quantity: 1,
      note: '',
      figureCondition: undefined,
      figureConditionNotes: '',
      boxCondition: undefined,
      boxConditionNotes: '',
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
      // Normalize to full URL before opening
      const urlToOpen = normalizeMfcLink(mfcLink);
      window.open(urlToOpen, '_blank');
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

    // Accept just the item number (e.g., "123456" or "1234567")
    const numericPattern = /^\d{4,}$/;
    if (numericPattern.test(value.trim())) {
      return true;
    }

    // First check if it's a valid URL
    const urlValidation = validateUrl(value);
    if (urlValidation !== true) return urlValidation;

    // Accept http/https and optional trailing slash or minor path/query fragments after the numeric id
    const mfcPattern = /^https?:\/\/(?:www\.)?myfigurecollection\.net\/item\/\d+(?:\/.*)?$/i;
    if (!mfcPattern.test(value)) {
      return 'Enter MFC item number (e.g., 123456) or full URL';
    }

    return true;
  };

  // Extract MFC item ID from URL or raw number
  const extractMfcItemId = (value: string | undefined): string | null => {
    if (!value) return null;
    const trimmed = value.trim();

    // If it's just a number, return it
    if (/^\d{4,}$/.test(trimmed)) {
      return trimmed;
    }

    // Extract from URL
    const match = trimmed.match(/\/item\/(\d+)/);
    return match ? match[1] : null;
  };

  // Normalize MFC input to full URL for scraping
  const normalizeMfcLink = (value: string): string => {
    if (!value) return '';
    const trimmed = value.trim();

    // If it's just a number, convert to full URL
    if (/^\d{4,}$/.test(trimmed)) {
      return `https://myfigurecollection.net/item/${trimmed}`;
    }

    return trimmed;
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

    // Normalize the input (accept item number or full URL)
    const normalizedLink = normalizeMfcLink(currentMfcLink);
    const mfcPattern = /^https?:\/\/(?:www\.)?myfigurecollection\.net\/item\/\d+(?:\/.*)?$/i;
    if (!mfcPattern.test(normalizedLink)) return;

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
          mfcLink: normalizedLink,
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

    // Only trigger if the link is valid and non-empty (accepts item number or full URL)
    const mfcPattern = /^https?:\/\/(?:www\.)?myfigurecollection\.net\/item\/\d+(?:\/.*)?$/i;
    const numericPattern = /^\d{4,}$/;
    const normalizedLink = normalizeMfcLink(currentMfcLink);
    if (typeof currentMfcLink === 'string' && currentMfcLink.trim() &&
        (mfcPattern.test(currentMfcLink) || numericPattern.test(currentMfcLink.trim()))) {

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

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        // Map nested Figure fields to flat form fields
        releaseDate: initialData.releases?.[0]?.date || '',
        releasePrice: initialData.releases?.[0]?.price,
        releaseCurrency: initialData.releases?.[0]?.currency || 'JPY',
        heightMm: initialData.dimensions?.heightMm,
        widthMm: initialData.dimensions?.widthMm,
        depthMm: initialData.dimensions?.depthMm,
        purchaseDate: initialData.purchaseInfo?.date || '',
        purchasePrice: initialData.purchaseInfo?.price,
        purchaseCurrency: initialData.purchaseInfo?.currency || 'USD',
        merchantName: initialData.merchant?.name || '',
        merchantUrl: initialData.merchant?.url || '',
      });
    } else {
      reset({
        manufacturer: '',
        name: '',
        scale: '',
        mfcLink: '',
        mfcAuth: '',
        location: '',
        storageDetail: '',
        imageUrl: '',
        // Schema v3.0 defaults
        jan: '',
        collectionStatus: 'owned' as CollectionStatus,
        releaseDate: '',
        releasePrice: undefined,
        releaseCurrency: 'JPY',
        heightMm: undefined,
        widthMm: undefined,
        depthMm: undefined,
        purchaseDate: '',
        purchasePrice: undefined,
        purchaseCurrency: 'USD',
        merchantName: '',
        merchantUrl: '',
        rating: undefined,
        wishRating: undefined,
        quantity: 1,
        note: '',
        figureCondition: undefined,
        figureConditionNotes: '',
        boxCondition: undefined,
        boxConditionNotes: '',
      });
    }
  }, [initialData, reset]);

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
    };
  }, []);

  // Load stored MFC cookies silently on mount (for scraping operations)
  useEffect(() => {
    const loadStoredCookies = async () => {
      const storedCookies = await retrieveMfcCookies();
      if (storedCookies && mountedRef.current) {
        setValue('mfcAuth', storedCookies);
      }
    };
    loadStoredCookies();
  }, [setValue]);

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
      storageDetail: '',
      imageUrl: '',
      // Schema v3.0 defaults - preserve collection status
      jan: '',
      collectionStatus: 'owned' as CollectionStatus,
      releaseDate: '',
      releasePrice: undefined,
      releaseCurrency: 'JPY',
      heightMm: undefined,
      widthMm: undefined,
      depthMm: undefined,
      purchaseDate: '',
      purchasePrice: undefined,
      purchaseCurrency: 'USD',
      merchantName: '',
      merchantUrl: '',
      rating: undefined,
      wishRating: undefined,
      quantity: 1,
      note: '',
      figureCondition: undefined,
      figureConditionNotes: '',
      boxCondition: undefined,
      boxConditionNotes: '',
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
          <FormLabel>
            MFC Item
            {extractMfcItemId(mfcLink) && (
              <Text as="span" color="brand.500" fontWeight="semibold" ml={2}>
                #{extractMfcItemId(mfcLink)}
              </Text>
            )}
          </FormLabel>
          <InputGroup>
            <Input
              {...register('mfcLink', {
                validate: validateMfcUrl
              })}
              placeholder="Enter item # (e.g., 123456) or full MFC URL"
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
            Enter just the item number or paste the full MFC URL • Click link icon to open page
          </Text>
        </FormControl>

        {/* Core Fields Section - Extracted Component */}
        <CoreFieldsSection
          register={register}
          getValues={getValues}
          errors={errors}
          mfcLink={mfcLink}
          imageUrl={imageUrl}
          handleScaleBlur={handleScaleBlur}
          validateManufacturer={validateManufacturer}
          validateName={validateName}
          validateUrl={validateUrl}
          openImageLink={openImageLink}
        />

        {/* Collection Details Section - Extracted Component */}
        <CollectionDetailsSection
          register={register}
          setValue={setValue}
          watch={watch}
        />

        {/* Catalog & Purchase Sections - Extracted Component */}
        <CatalogPurchaseSection
          register={register}
          setValue={setValue}
          watch={watch}
        />

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
