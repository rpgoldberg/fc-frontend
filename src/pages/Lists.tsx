import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Center,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  Flex,
  Button,
  useToast,
  Tooltip,
} from '@chakra-ui/react';
import { FaTrash, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { getLists, deleteList } from '../api';
import { MfcList } from '../types';

const PRIVACY_COLORS: Record<string, string> = {
  public: 'green',
  friends: 'blue',
  private: 'red',
};

const Lists: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError } = useQuery(
    ['lists', page],
    () => getLists({ page, limit, sortBy: 'name', sortOrder: 'asc' }),
    { keepPreviousData: true }
  );

  const handleRowClick = useCallback((listId: string) => {
    navigate(`/lists/${listId}`);
  }, [navigate]);

  const handleDelete = useCallback(async (e: React.MouseEvent, listId: string) => {
    e.stopPropagation();
    try {
      await deleteList(listId);
      queryClient.invalidateQueries('lists');
      toast({ title: 'List deleted', status: 'success', duration: 3000 });
    } catch {
      toast({ title: 'Failed to delete list', status: 'error', duration: 3000 });
    }
  }, [queryClient, toast]);

  return (
    <Box p={4}>
      <Flex align="center" justify="space-between" mb={6}>
        <Heading size="lg">My Lists</Heading>
        {data && (
          <Text color="gray.500" fontSize="sm">
            {data.total} lists
          </Text>
        )}
      </Flex>

      {isLoading && (
        <Center py={12}>
          <Spinner size="xl" data-testid="lists-spinner" />
        </Center>
      )}

      {isError && (
        <Center py={12}>
          <Text color="red.500">Error loading lists. Please try again.</Text>
        </Center>
      )}

      {data && data.data.length === 0 && (
        <Center py={12}>
          <Text color="gray.500">No lists found. Sync your MFC account to import lists.</Text>
        </Center>
      )}

      {data && data.data.length > 0 && (
        <>
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Teaser</Th>
                  <Th>Privacy</Th>
                  <Th isNumeric>Items</Th>
                  <Th w="50px"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.data.map((list: MfcList) => (
                  <Tr
                    key={list._id}
                    cursor="pointer"
                    _hover={{ bg: 'gray.50' }}
                    onClick={() => handleRowClick(list._id)}
                  >
                    <Td fontWeight="medium">{list.name}</Td>
                    <Td color="gray.600" maxW="300px" isTruncated>
                      {list.teaser || '—'}
                    </Td>
                    <Td>
                      <Badge colorScheme={PRIVACY_COLORS[list.privacy] || 'gray'}>
                        {list.privacy}
                      </Badge>
                    </Td>
                    <Td isNumeric>{list.itemCount}</Td>
                    <Td>
                      <Tooltip label="Delete list">
                        <IconButton
                          aria-label="Delete list"
                          icon={<FaTrash />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={(e) => handleDelete(e, list._id)}
                        />
                      </Tooltip>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          {data.pages > 1 && (
            <Flex justify="center" align="center" mt={4} gap={4}>
              <Button
                size="sm"
                leftIcon={<FaChevronLeft />}
                isDisabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Text fontSize="sm" color="gray.600">
                Page {page} of {data.pages}
              </Text>
              <Button
                size="sm"
                rightIcon={<FaChevronRight />}
                isDisabled={page >= data.pages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </Flex>
          )}
        </>
      )}
    </Box>
  );
};

export default Lists;
