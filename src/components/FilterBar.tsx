import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  Input,
  Select,
  Button,
  FormControl,
  FormLabel,
  useDisclosure,
  Collapse,
  SimpleGrid,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaFilter, FaTimes } from 'react-icons/fa';
import { useQuery } from 'react-query';
import { getFigureStats } from '../api';

interface FilterValues {
  manufacturer?: string;
  scale?: string;
  location?: string;
  boxNumber?: string;
}

interface FilterBarProps {
  onFilter: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
}

const FilterBar: React.FC<FilterBarProps> = ({ onFilter, initialFilters = {} }) => {
  const { isOpen, onToggle } = useDisclosure();
  const [filters, setFilters] = useState<FilterValues>(initialFilters);

  const { data: stats } = useQuery('figureStats', getFigureStats, {
    enabled: isOpen,
  });

  const filterBg = useColorModeValue('white', 'gray.800');

  // Auto-apply filters on select change
  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value || undefined };
    // Remove undefined/empty values
    Object.keys(newFilters).forEach(key => {
      if (!newFilters[key as keyof FilterValues]) {
        delete newFilters[key as keyof FilterValues];
      }
    });
    setFilters(newFilters);
    onFilter(newFilters);
  }, [filters, onFilter]);

  // Debounced input change for box number (text input needs debounce)
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []);

  // Apply filter when user stops typing in box number field
  const handleInputBlur = useCallback(() => {
    const cleanFilters = { ...filters };
    Object.keys(cleanFilters).forEach(key => {
      if (!cleanFilters[key as keyof FilterValues]) {
        delete cleanFilters[key as keyof FilterValues];
      }
    });
    onFilter(cleanFilters);
  }, [filters, onFilter]);

  // Handle Enter key in box number input
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputBlur();
    }
  }, [handleInputBlur]);

  const handleReset = () => {
    setFilters({});
    onFilter({});
  };

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return (
    <Box mb={4}>
      <Flex justify="space-between" align="center" mb={2}>
        <Button 
          leftIcon={<FaFilter />} 
          size="sm" 
          variant="ghost" 
          onClick={onToggle}
          color={isOpen ? 'brand.500' : 'gray.500'}
        >
          Filters
        </Button>
        
        {Object.values(filters).some(v => v) && (
          <Button 
            rightIcon={<FaTimes />} 
            size="sm" 
            variant="ghost" 
            onClick={handleReset}
            color="red.500"
          >
            Clear Filters
          </Button>
        )}
      </Flex>

      <Collapse in={isOpen} animateOpacity>
        <Box
          p={4}
          bg={filterBg}
          borderRadius="md"
          shadow="sm"
          mb={4}
        >
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <FormControl>
              <FormLabel fontSize="sm">Manufacturer</FormLabel>
              <Select
                name="manufacturer"
                placeholder="All Manufacturers"
                value={filters.manufacturer || ''}
                onChange={handleSelectChange}
                size="sm"
              >
                {stats?.manufacturerStats
                  .filter(({ _id }) => _id != null && _id !== '')
                  .map(({ _id, count }) => (
                    <option key={_id} value={_id}>
                      {_id} ({count})
                    </option>
                  ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Scale</FormLabel>
              <Select
                name="scale"
                placeholder="All Scales"
                value={filters.scale || ''}
                onChange={handleSelectChange}
                size="sm"
              >
                {stats?.scaleStats
                  .filter(({ _id }) => _id != null && _id !== '')
                  .map(({ _id, count }) => (
                    <option key={_id} value={_id}>
                      {_id} ({count})
                    </option>
                  ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Location</FormLabel>
              <Select
                name="location"
                placeholder="All Locations"
                value={filters.location || ''}
                onChange={handleSelectChange}
                size="sm"
              >
                {stats?.locationStats
                  .filter(({ _id }) => _id != null && _id !== '')
                  .map(({ _id, count }) => (
                    <option key={_id} value={_id}>
                      {_id} ({count})
                    </option>
                  ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Box Number</FormLabel>
              <Input
                name="boxNumber"
                placeholder="Any box (press Enter to apply)"
                value={filters.boxNumber || ''}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                size="sm"
              />
            </FormControl>
          </SimpleGrid>
        </Box>
      </Collapse>
    </Box>
  );
};

export default FilterBar;
