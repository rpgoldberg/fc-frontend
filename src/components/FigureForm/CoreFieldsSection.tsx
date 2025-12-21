/**
 * Core Fields Section Component
 *
 * Extracted from FigureForm.tsx to keep modules under 750 lines.
 * Contains manufacturer, name, scale, location, storage detail, JAN, and image URL fields.
 */
import React, { useState } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  Grid,
  GridItem,
  InputGroup,
  InputRightElement,
  IconButton,
  Tooltip,
  Text,
  Image,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaQuestionCircle, FaImage } from 'react-icons/fa';
import { UseFormRegister, UseFormGetValues, FieldErrors } from 'react-hook-form';
import { FigureFormData } from '../../types';

interface CoreFieldsSectionProps {
  register: UseFormRegister<FigureFormData>;
  getValues: UseFormGetValues<FigureFormData>;
  errors: FieldErrors<FigureFormData>;
  mfcLink: string | undefined;
  imageUrl: string | undefined;
  handleScaleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  validateManufacturer: (value: string | undefined) => true | string;
  validateName: (value: string | undefined) => true | string;
  validateUrl: (value: string | undefined) => true | string;
  openImageLink: () => void;
}

const CoreFieldsSection: React.FC<CoreFieldsSectionProps> = ({
  register,
  errors,
  mfcLink,
  imageUrl,
  handleScaleBlur,
  validateManufacturer,
  validateName,
  validateUrl,
  openImageLink,
}) => {
  const [imageError, setImageError] = useState(false);
  const previewBorderColor = useColorModeValue('gray.200', 'gray.600');
  const previewBg = useColorModeValue('gray.50', 'gray.700');

  // Reset image error when imageUrl changes
  React.useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  return (
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
        <FormControl>
          <FormLabel>
            Storage Detail
            <Tooltip label="Where within your storage location (shelf label, box ID, drawer number, etc.)">
              <IconButton
                aria-label="Storage detail info"
                icon={<FaQuestionCircle />}
                size="xs"
                variant="ghost"
                ml={1}
              />
            </Tooltip>
          </FormLabel>
          <Input
            {...register('storageDetail')}
            placeholder="e.g., Shelf A-3, Box #12, Left corner"
          />
        </FormControl>
      </GridItem>

      <GridItem>
        <FormControl>
          <FormLabel>
            JAN/UPC/EAN
            <Tooltip label="Product barcode number from packaging">
              <IconButton
                aria-label="Barcode info"
                icon={<FaQuestionCircle />}
                size="xs"
                variant="ghost"
                ml={1}
              />
            </Tooltip>
          </FormLabel>
          <Input
            {...register('jan')}
            placeholder="e.g., 4571245296115"
          />
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
  );
};

export default CoreFieldsSection;
