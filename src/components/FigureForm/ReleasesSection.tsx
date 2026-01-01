/**
 * ReleasesSection Component
 *
 * Manages releases array in the figure form.
 * Each release has: date, price, currency, JAN (barcode), isRerelease flag.
 * Uses react-hook-form's useFieldArray for array management.
 */

import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
  Text,
  VStack,
  Badge,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { FigureFormData, IReleaseFormData } from '../../types';

const CURRENCY_OPTIONS = ['JPY', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];

const ReleasesSection: React.FC = () => {
  const { control, register } = useFormContext<FigureFormData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'releases',
  });

  const handleAddRelease = () => {
    append({
      date: '',
      price: undefined,
      currency: 'JPY',
      jan: '',
      isRerelease: false,
    } as IReleaseFormData);
  };

  return (
    <Box>
      <HStack justify="space-between" mb={3}>
        <Text fontWeight="semibold" fontSize="md">
          Releases
        </Text>
        <Button
          leftIcon={<FaPlus />}
          size="sm"
          variant="outline"
          colorScheme="orange"
          onClick={handleAddRelease}
          aria-label="Add release"
        >
          Add Release
        </Button>
      </HStack>

      {fields.length === 0 ? (
        <Text color="gray.500" fontSize="sm" fontStyle="italic">
          No releases added. Click &quot;Add Release&quot; to add release information.
        </Text>
      ) : (
        <VStack spacing={4} align="stretch">
          {fields.map((field, index) => (
            <Box
              key={field.id}
              p={4}
              borderWidth="1px"
              borderRadius="md"
              bg="gray.50"
              position="relative"
            >
              {/* Rerelease Badge */}
              {field.isRerelease && (
                <Badge
                  colorScheme="orange"
                  position="absolute"
                  top={2}
                  right={12}
                >
                  Rerelease
                </Badge>
              )}

              {/* Remove Button */}
              <IconButton
                aria-label="Remove release"
                icon={<FaTrash />}
                size="sm"
                colorScheme="red"
                variant="ghost"
                position="absolute"
                top={2}
                right={2}
                onClick={() => remove(index)}
              />

              <Grid templateColumns="repeat(4, 1fr)" gap={3}>
                {/* Release Date */}
                <GridItem>
                  <FormControl>
                    <FormLabel fontSize="xs" mb={1}>Date</FormLabel>
                    <Input
                      {...register(`releases.${index}.date` as const)}
                      placeholder="YYYY-MM"
                      size="sm"
                      defaultValue={field.date}
                    />
                  </FormControl>
                </GridItem>

                {/* Price */}
                <GridItem>
                  <FormControl>
                    <FormLabel fontSize="xs" mb={1}>Price</FormLabel>
                    <Input
                      {...register(`releases.${index}.price` as const, {
                        valueAsNumber: true,
                      })}
                      type="number"
                      placeholder="Price"
                      size="sm"
                      defaultValue={field.price}
                    />
                  </FormControl>
                </GridItem>

                {/* Currency */}
                <GridItem>
                  <FormControl>
                    <FormLabel fontSize="xs" mb={1}>Currency</FormLabel>
                    <Select
                      {...register(`releases.${index}.currency` as const)}
                      aria-label="Currency"
                      size="sm"
                      defaultValue={field.currency || 'JPY'}
                    >
                      {CURRENCY_OPTIONS.map((curr) => (
                        <option key={curr} value={curr}>
                          {curr}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </GridItem>

                {/* JAN/Barcode */}
                <GridItem>
                  <FormControl>
                    <FormLabel fontSize="xs" mb={1}>JAN/UPC</FormLabel>
                    <Input
                      {...register(`releases.${index}.jan` as const)}
                      placeholder="Barcode"
                      size="sm"
                      defaultValue={field.jan}
                    />
                  </FormControl>
                </GridItem>
              </Grid>

              {/* Rerelease Checkbox */}
              <HStack mt={3}>
                <Controller
                  control={control}
                  name={`releases.${index}.isRerelease` as const}
                  defaultValue={field.isRerelease}
                  render={({ field: { onChange, onBlur, value, ref } }) => (
                    <Checkbox
                      isChecked={value}
                      onChange={(e) => onChange(e.target.checked)}
                      onBlur={onBlur}
                      ref={ref}
                      aria-label="Rerelease"
                      size="sm"
                    >
                      <Text fontSize="sm">This is a rerelease</Text>
                    </Checkbox>
                  )}
                />
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
};

export default ReleasesSection;
