import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import {
  Box,
  Heading,
  SimpleGrid,
  Button,
  Flex,
  Text,
  Spinner,
  Center,
  useToast,
  useDisclosure,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Icon,
} from '@chakra-ui/react';
import { FaPlus, FaFileImport, FaSync, FaChevronDown } from 'react-icons/fa';
import { Link as RouterLink } from 'react-router-dom';
import { getFigures, filterFigures } from '../api';
import FigureCard from '../components/FigureCard';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import BulkImportModal from '../components/BulkImportModal';
import MfcSyncModal from '../components/MfcSyncModal';

const FigureList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useDisclosure();
  const { isOpen: isSyncOpen, onOpen: onSyncOpen, onClose: onSyncClose } = useDisclosure();

  const handleImportComplete = () => {
    // Invalidate the figures query to refresh the list
    queryClient.invalidateQueries(['figures']);
  };

  const handleSyncComplete = () => {
    // Invalidate the figures query to refresh the list
    queryClient.invalidateQueries(['figures']);
  };
  
  const { data, isLoading, error } = useQuery(
    ['figures', page, filters],
    () => filters && Object.keys(filters).length > 0 
      ? filterFigures({ ...filters, page, limit: 12 })
      : getFigures(page, 12),
    {
      keepPreviousData: true,
      onError: (err: any) => {
        toast({
          title: 'Error',
          description: err.response?.data?.message || 'Failed to load figures',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      },
    }
  ) || { data: null, isLoading: false, error: null };
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo(0, 0);
  };
  
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setPage(1);
  };

  if (isLoading) {
    return (
      <Center h="50vh">
        <Spinner size="xl" color="brand.500" thickness="4px" />
      </Center>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={10}>
        <Heading size="md" color="red.500" mb={4}>
          Error loading figures
        </Heading>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Your Figures</Heading>
        <HStack spacing={3}>
          <Menu>
            <MenuButton
              as={Button}
              leftIcon={<FaFileImport />}
              rightIcon={<Icon as={FaChevronDown} />}
              colorScheme="purple"
              variant="outline"
            >
              Import from MFC
            </MenuButton>
            <MenuList>
              <MenuItem icon={<Icon as={FaFileImport} />} onClick={onImportOpen}>
                Import CSV File
              </MenuItem>
              <MenuItem icon={<Icon as={FaSync} />} onClick={onSyncOpen}>
                Sync MFC Account
              </MenuItem>
            </MenuList>
          </Menu>
          <Button
            as={RouterLink}
            to="/figures/add"
            leftIcon={<FaPlus />}
            colorScheme="brand"
          >
            Add Figure
          </Button>
        </HStack>
      </Flex>

      <FilterBar
        onFilter={handleFilterChange}
        initialFilters={filters}
      />
      
      {data?.total === 0 ? (
        Object.keys(filters).length > 0 ? (
          <EmptyState type="filter" onClearFilters={() => handleFilterChange({})} />
        ) : (
          <EmptyState type="collection" />
        )
      ) : (
        <>
          <Text mb={4} color="gray.600">
            Showing {data?.data.length} of {data?.total} figures
          </Text>
          
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
            {data?.data.map((figure) => (
              <FigureCard key={figure._id} figure={figure} />
            ))}
          </SimpleGrid>
          
          <Pagination
            currentPage={page}
            totalPages={data?.pages || 1}
            onPageChange={handlePageChange}
          />
        </>
      )}

      <BulkImportModal
        isOpen={isImportOpen}
        onClose={onImportClose}
        onImportComplete={handleImportComplete}
      />

      <MfcSyncModal
        isOpen={isSyncOpen}
        onClose={onSyncClose}
        onSyncComplete={handleSyncComplete}
      />
    </Box>
  );
};

export default FigureList;
