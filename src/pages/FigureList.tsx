import React, { useState, useEffect, useRef } from 'react';
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
  Spacer,
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
import MfcCookiesModal from '../components/MfcCookiesModal';
import SortControls, { SortField, SortDirection, SortParams } from '../components/SortControls';
import { useSyncStore } from '../stores/syncStore';

const FigureList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortDirection>('desc');
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useDisclosure();
  const { isOpen: isSyncOpen, onOpen: onSyncOpen, onClose: onSyncClose } = useDisclosure();
  const { isOpen: isCookiesOpen, onOpen: onCookiesOpen, onClose: onCookiesClose } = useDisclosure();

  // Subscribe to sync store for auto-refresh
  const { stats, phase, isActive } = useSyncStore();
  const lastCompletedCountRef = useRef<number>(0);

  // Auto-refresh figures when sync completes items
  useEffect(() => {
    if (!stats) {
      lastCompletedCountRef.current = 0;
      return;
    }

    const currentCompleted = stats.completed;
    const lastCompleted = lastCompletedCountRef.current;

    // Refresh when completed count increases (new items processed)
    // Use a threshold to batch refreshes (every 5 items or on completion)
    if (currentCompleted > lastCompleted) {
      const delta = currentCompleted - lastCompleted;
      const shouldRefresh = delta >= 5 || phase === 'completed' || !isActive;

      if (shouldRefresh) {
        queryClient.invalidateQueries(['figures']);
        lastCompletedCountRef.current = currentCompleted;
      }
    }
  }, [stats, phase, isActive, queryClient]);

  // Also refresh immediately when sync completes
  useEffect(() => {
    if (phase === 'completed') {
      queryClient.invalidateQueries(['figures']);
    }
  }, [phase, queryClient]);

  const handleImportComplete = () => {
    // Invalidate the figures query to refresh the list
    queryClient.invalidateQueries(['figures']);
  };

  const handleSyncComplete = () => {
    // Invalidate the figures query to refresh the list
    queryClient.invalidateQueries(['figures']);
  };

  const { data, isLoading, error } = useQuery(
    ['figures', page, filters, sortBy, sortOrder],
    () => filters && Object.keys(filters).length > 0
      ? filterFigures({ ...filters, page, limit: 12, sortBy, sortOrder })
      : getFigures(page, 12, sortBy, sortOrder),
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

  const handleSortChange = (params: SortParams) => {
    setSortBy(params.sortBy);
    setSortOrder(params.sortOrder);
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
          {/* Add Figure button first (left) */}
          <Button
            as={RouterLink}
            to="/figures/add"
            leftIcon={<FaPlus />}
            colorScheme="brand"
          >
            Add Figure
          </Button>
          {/* Sync with MFC dropdown second (right) */}
          <Menu>
            <MenuButton
              as={Button}
              leftIcon={<FaSync />}
              rightIcon={<Icon as={FaChevronDown} />}
              colorScheme="purple"
              variant="outline"
            >
              Sync with MFC
            </MenuButton>
            <MenuList>
              <MenuItem icon={<Icon as={FaSync} />} onClick={onSyncOpen}>
                Sync MFC Account
              </MenuItem>
              <MenuItem icon={<Icon as={FaFileImport} />} onClick={onImportOpen}>
                Import CSV File
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>

      <FilterBar
        onFilter={handleFilterChange}
        initialFilters={filters}
      />

      <Flex mb={4} align="center" wrap="wrap" gap={4}>
        <Text color="gray.600">
          {data?.total ? `Showing ${data.data.length} of ${data.total} figures` : 'Loading...'}
        </Text>
        <Spacer />
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />
      </Flex>

      {data?.total === 0 ? (
        Object.keys(filters).length > 0 ? (
          <EmptyState type="filter" onClearFilters={() => handleFilterChange({})} />
        ) : (
          <EmptyState type="collection" />
        )
      ) : (
        <>
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
        onOpenCookiesModal={onCookiesOpen}
      />

      <MfcCookiesModal
        isOpen={isCookiesOpen}
        onClose={onCookiesClose}
        onCookiesChanged={() => {
          // Cookies were updated - if sync modal was open, it will re-check on reopen
        }}
      />
    </Box>
  );
};

export default FigureList;
