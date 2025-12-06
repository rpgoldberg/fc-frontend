import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Image, Text, Badge, Link, Flex, IconButton, useToast, useColorModeValue } from '@chakra-ui/react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { Figure } from '../types';
import { deleteFigure } from '../api';
import { useMutation, useQueryClient } from 'react-query';

interface FigureCardProps {
  figure: Figure;
  searchQuery?: string;
}

// Helper component to highlight matching text
const HighlightedText: React.FC<{ text: string; query?: string; color?: string }> = ({
  text,
  query,
  color = 'yellow.200'
}) => {
  if (!query || !text) return <>{text}</>;

  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  if (terms.length === 0) return <>{text}</>;

  // Build a regex that matches any of the search terms (case-insensitive)
  const escapedTerms = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = terms.some(term => part.toLowerCase() === term);
        return isMatch ? (
          <Box
            key={index}
            as="mark"
            display="inline"
            px={0.5}
            borderRadius="sm"
            sx={{
              // Override browser default mark styles with !important
              background: `var(--chakra-colors-${color.replace('.', '-')}) !important`,
              color: 'inherit',
            }}
          >
            {part}
          </Box>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        );
      })}
    </>
  );
};

const FigureCard: React.FC<FigureCardProps> = ({ figure, searchQuery }) => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const cardBg = useColorModeValue('white', 'gray.800');
  const imageBg = useColorModeValue('gray.50', 'gray.700');

  const deleteMutation = useMutation(() => deleteFigure(figure._id), {
    onSuccess: () => {
      // Invalidate all queries that might contain figure data
      queryClient.invalidateQueries('figures');
      queryClient.invalidateQueries('recentFigures');
      queryClient.invalidateQueries('dashboardStats');
      
      toast({
        title: 'Figure deleted',
        description: `${figure.name} has been removed from your collection.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete figure',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${figure.name}?`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      bg={cardBg}
      shadow="md"
      transition="all 0.3s"
      _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
    >
      <Link
        as={RouterLink}
        to={`/figures/${figure._id}`}
        display="block"
        cursor="pointer"
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          h="200px"
          bg={imageBg}
          overflow="hidden"
        >
          <Image
            src={figure.imageUrl || '/placeholder-figure.png'}
            alt={figure.name}
            maxH="100%"
            maxW="100%"
            objectFit="contain"
            fallbackSrc="https://via.placeholder.com/300x200?text=No+Image"
          />
        </Box>
      </Link>

      <Box p={4}>
        {figure.mfcLink && (
          <Link 
            href={figure.mfcLink} 
            isExternal 
            fontSize="xs" 
            color="blue.500" 
            display="block" 
            mb={2}
            noOfLines={1}
          >
            MFC: {figure.mfcLink}
          </Link>
        )}
        <Link
          as={RouterLink}
          to={`/figures/${figure._id}`}
          fontWeight="semibold"
          fontSize="lg"
          lineHeight="tight"
          display="block"
          noOfLines={1}
          mb={1}
        >
          <HighlightedText text={figure.name} query={searchQuery} />
        </Link>
        <Text fontSize="sm" color="gray.600" mb={2}>
          <HighlightedText text={figure.manufacturer || ''} query={searchQuery} />
        </Text>
        <Badge colorScheme="brand" mb={2}>
          {figure.scale}
        </Badge>

        <Text fontSize="xs" color="gray.500">
          Location: <HighlightedText text={figure.location || ''} query={searchQuery} /> (Box {figure.boxNumber})
        </Text>

        <Flex mt={4} justify="space-between">
                      <Link
            as={RouterLink}
            to={`/figures/edit/${figure._id}`}
            fontSize="sm"
            color="brand.600"
          >
            <IconButton
              aria-label="Edit figure"
              icon={<FaEdit />}
              size="sm"
              variant="ghost"
              colorScheme="brand"
            />
          </Link>
          <IconButton
            aria-label="Delete figure"
            icon={<FaTrash />}
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={handleDelete}
            isLoading={deleteMutation.isLoading}
          />
        </Flex>
      </Box>
    </Box>
  );
};

export default FigureCard;
