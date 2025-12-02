import React, { useState, useCallback } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Heading,
  Button,
  Flex,
  useToast,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
useColorModeValue, } from '@chakra-ui/react';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { FaArrowLeft } from 'react-icons/fa';
import { createFigure } from '../api';
import FigureForm from '../components/FigureForm';
import { FigureFormData } from '../types';

type SubmitAction = 'save' | 'saveAndAdd' | null;

const AddFigure: React.FC = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [currentAction, setCurrentAction] = useState<SubmitAction>(null);

  const mutation = useMutation(createFigure, {
    onSuccess: () => {
      // Invalidate all queries that might contain figure data
      queryClient.invalidateQueries('figures');
      queryClient.invalidateQueries('recentFigures');
      queryClient.invalidateQueries('dashboardStats');

      // Only navigate if NOT "Save & Add Another"
      if (currentAction !== 'saveAndAdd') {
        toast({
          title: 'Success',
          description: 'Figure added successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        navigate('/figures');
      } else {
        // For "Save & Add Another", show a different toast
        toast({
          title: 'Figure added!',
          description: 'Form cleared for next entry.',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        // Form will be reset by FigureForm's useEffect when it detects loading finished
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add figure',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      // Reset action on error so user can try again
      setCurrentAction(null);
    },
  });

  const handleSubmit = (data: FigureFormData, addAnother?: boolean) => {
    const action: SubmitAction = addAnother ? 'saveAndAdd' : 'save';
    setCurrentAction(action);
    mutation.mutate(data);
  };

  const handleResetComplete = useCallback(() => {
    // Reset action after form has been reset
    setCurrentAction(null);
  }, []);

  return (
    <Box>
      <Breadcrumb spacing="8px" separator={<ChevronRightIcon color="gray.500" />} mb={5}>
        <BreadcrumbItem>
          <BreadcrumbLink as={RouterLink} to="/">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink as={RouterLink} to="/figures">Figures</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>Add New Figure</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Add New Figure</Heading>
        <Button
          leftIcon={<FaArrowLeft />}
          as={RouterLink}
          to="/figures"
          variant="outline"
        >
          Back to Figures
        </Button>
      </Flex>
      
      <Box bg={cardBg} p={6} borderRadius="lg" shadow="md">
        <FigureForm
          onSubmit={handleSubmit}
          isLoading={mutation.isLoading}
          loadingAction={currentAction}
          onResetComplete={handleResetComplete}
        />
      </Box>
    </Box>
  );
};

export default AddFigure;
