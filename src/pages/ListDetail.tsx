import React from 'react';
import { useQuery } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Center,
  Badge,
  Flex,
  IconButton,
  Divider,
  Wrap,
  WrapItem,
  Tag,
  Tooltip,
} from '@chakra-ui/react';
import { FaArrowLeft, FaComments, FaBell, FaSearch } from 'react-icons/fa';
import { getListById } from '../api';

const PRIVACY_COLORS: Record<string, string> = {
  public: 'green',
  friends: 'blue',
  private: 'red',
};

const ListDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: list, isLoading, isError } = useQuery(
    ['list', id],
    () => getListById(id!),
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <Center py={12}>
        <Spinner size="xl" data-testid="list-detail-spinner" />
      </Center>
    );
  }

  if (isError || !list) {
    return (
      <Center py={12}>
        <Text color="red.500">Error loading list details.</Text>
      </Center>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Box p={4}>
      {/* Header */}
      <Flex align="center" mb={4} gap={3}>
        <Tooltip label="Back to lists">
          <IconButton
            aria-label="Back to lists"
            icon={<FaArrowLeft />}
            variant="ghost"
            size="sm"
            onClick={() => navigate('/lists')}
          />
        </Tooltip>
        <Heading size="lg">{list.name}</Heading>
        <Badge colorScheme={PRIVACY_COLORS[list.privacy] || 'gray'} fontSize="sm">
          {list.privacy}
        </Badge>
      </Flex>

      {/* Teaser */}
      {list.teaser && (
        <Text color="gray.600" mb={3} fontSize="md">
          {list.teaser}
        </Text>
      )}

      {/* Item count + dates */}
      <Flex gap={4} mb={4} flexWrap="wrap" fontSize="sm" color="gray.500">
        <Text>{list.itemCount} items</Text>
        {list.mfcCreatedAt && (
          <Text>Created on MFC: {formatDate(list.mfcCreatedAt)}</Text>
        )}
        {list.lastSyncedAt && (
          <Text>Last synced: {formatDate(list.lastSyncedAt)}</Text>
        )}
      </Flex>

      {/* Settings flags */}
      <Wrap spacing={2} mb={4}>
        {list.allowComments && (
          <WrapItem>
            <Tag size="sm" colorScheme="teal" variant="subtle">
              <FaComments style={{ marginRight: 4 }} /> Comments enabled
            </Tag>
          </WrapItem>
        )}
        {list.mailOnSales && (
          <WrapItem>
            <Tag size="sm" colorScheme="orange" variant="subtle">
              <FaBell style={{ marginRight: 4 }} /> Sale notifications
            </Tag>
          </WrapItem>
        )}
        {list.mailOnHunts && (
          <WrapItem>
            <Tag size="sm" colorScheme="purple" variant="subtle">
              <FaSearch style={{ marginRight: 4 }} /> Hunt notifications
            </Tag>
          </WrapItem>
        )}
      </Wrap>

      <Divider mb={4} />

      {/* Description (HTML) */}
      {list.description && (
        <Box mb={4}>
          <Heading size="sm" mb={2}>Description</Heading>
          <Box
            dangerouslySetInnerHTML={{ __html: list.description }}
            sx={{
              'p': { mb: 2 },
              'b, strong': { fontWeight: 'bold' },
              'i, em': { fontStyle: 'italic' },
              'a': { color: 'brand.500', textDecoration: 'underline' },
            }}
          />
        </Box>
      )}

      {/* Item MFC IDs */}
      <Box>
        <Heading size="sm" mb={2}>Items ({list.itemMfcIds.length})</Heading>
        {list.itemMfcIds.length === 0 ? (
          <Text color="gray.500" fontSize="sm">No items in this list.</Text>
        ) : (
          <Wrap spacing={2}>
            {list.itemMfcIds.map((mfcId) => (
              <WrapItem key={mfcId}>
                <Tag size="sm" variant="outline">
                  #{mfcId}
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
        )}
      </Box>
    </Box>
  );
};

export default ListDetail;
