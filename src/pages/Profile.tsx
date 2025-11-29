import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  HStack,
  Text,
  Divider,
  useToast,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  InputGroup,
  InputRightElement,
  Icon,
  Badge,
  Textarea,
  Tooltip,
  RadioGroup,
  Radio,
  Stack,
  Collapse,
  Code,
useColorModeValue, } from '@chakra-ui/react';
import { FaEye, FaEyeSlash, FaLock, FaTrash, FaQuestionCircle, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import { useForm } from 'react-hook-form';
import { getUserProfile, updateUserProfile } from '../api';
import { useAuthStore } from '../stores/authStore';
import { clearMfcCookies, hasMfcCookies, getStorageType, type StorageType, storeMfcCookies, retrieveMfcCookies } from '../utils/crypto';
import { usePublicConfigs } from '../hooks/usePublicConfig';

interface ProfileFormData {
  username: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

const Profile: React.FC = () => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const cookieBg = useColorModeValue('blue.50', 'blue.900');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const helpBg = useColorModeValue('gray.50', 'gray.800');
  const storageTextColor = useColorModeValue('blue.600', 'blue.300');
  const warningColor = useColorModeValue('red.600', 'red.400');

  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = React.useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [cookiesStored, setCookiesStored] = React.useState(hasMfcCookies());
  const [storageType, setStorageType] = React.useState<StorageType>(() => {
    // Check if cookies are already stored and preserve their storage type
    const existingType = getStorageType();
    return existingType || 'session';
  });
  const [mfcAuthCookies, setMfcAuthCookies] = React.useState('');
  const [showHelp, setShowHelp] = React.useState(false);
  const [showSecurity, setShowSecurity] = React.useState(false);

  // Fetch dynamic MFC cookie instructions and script from backend
  const { configs: mfcConfigs, isLoading: isLoadingConfigs } = usePublicConfigs([
    'mfc_cookie_script',
    'mfc_cookie_instructions'
  ]);

  const { data: profile, isLoading, error } = useQuery('userProfile', getUserProfile) || { data: null, isLoading: false, error: null };
  
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    defaultValues: {
      username: profile?.username || user?.username || '',
      email: profile?.email || user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });
  
  React.useEffect(() => {
    if (profile) {
      reset({
        username: profile.username,
        email: profile.email,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    }
  }, [profile, reset]);
  
  const newPassword = watch('newPassword');
  
  const mutation = useMutation(
    (data: Partial<ProfileFormData>) => updateUserProfile({
      username: data.username,
      email: data.email,
      ...(data.newPassword ? { password: data.newPassword } : {}),
    }),
    {
      onSuccess: (userData) => {
        setUser({
          ...user!,
          username: userData.username,
          email: userData.email,
        });
        queryClient.invalidateQueries('userProfile');
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        reset({
          username: userData.username,
          email: userData.email,
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        });
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to update profile',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      },
    }
  );

  const onSubmit = (data: ProfileFormData) => {
    // Only include fields that have changed
    const updateData: Partial<ProfileFormData> = {};
    
    if (data.username !== profile?.username) {
      updateData.username = data.username;
    }
    
    if (data.email !== profile?.email) {
      updateData.email = data.email;
    }
    
    if (data.newPassword) {
      updateData.newPassword = data.newPassword;
    }
    
    if (Object.keys(updateData).length > 0) {
      mutation.mutate(updateData);
    } else {
      toast({
        title: 'Information',
        description: 'No changes to save',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleClearCookies = () => {
    clearMfcCookies();
    setMfcAuthCookies('');
    setCookiesStored(false);
    setStorageType('session');
    toast({
      title: 'MFC Cookies Cleared',
      description: 'Your MyFigureCollection cookies have been removed.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Load stored MFC cookies on mount
  React.useEffect(() => {
    const loadStoredCookies = async () => {
      const storedCookies = await retrieveMfcCookies();
      if (storedCookies) {
        setMfcAuthCookies(storedCookies);
        setCookiesStored(true);
        const currentType = getStorageType();
        if (currentType) {
          setStorageType(currentType as StorageType);
        }
      } else {
        setCookiesStored(false);
      }
    };
    loadStoredCookies();
  }, []);

  // Watch mfcAuthCookies and save when storage type changes
  React.useEffect(() => {
    const saveCookies = async () => {
      if (mfcAuthCookies) {
        await storeMfcCookies(mfcAuthCookies, storageType);
        setCookiesStored(true);
      } else {
        clearMfcCookies();
        setCookiesStored(false);
      }
    };
    saveCookies();
  }, [mfcAuthCookies, storageType]);

  if (isLoading) {
    return (
      <Center h="50vh">
        <Spinner size="xl" color="brand.500" thickness="4px" />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        Failed to load profile. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      <Heading size="lg" mb={6}>Your Profile</Heading>
      
      <Box bg={cardBg} p={6} borderRadius="lg" shadow="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack spacing={6} align="stretch">
            <FormControl isInvalid={!!errors.username}>
              <FormLabel>Username</FormLabel>
              <Input
                autoComplete="username"
                {...register('username', {
                  required: 'Username is required',
                  minLength: {
                    value: 3,
                    message: 'Username must be at least 3 characters',
                  },
                })}
              />
              {errors.username && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {errors.username.message}
                </Text>
              )}
            </FormControl>
            
            <FormControl isInvalid={!!errors.email}>
              <FormLabel>Email Address</FormLabel>
              <Input
                type="email"
                autoComplete="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
              {errors.email && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {errors.email.message}
                </Text>
              )}
            </FormControl>
            
            <Divider />
            
            <Heading size="md">Change Password</Heading>
            
            <FormControl isInvalid={!!errors.newPassword}>
              <FormLabel>New Password</FormLabel>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...register('newPassword', {
                    minLength: {
                      value: 6,
                      message: 'New password must be at least 6 characters',
                    },
                  })}
                />
                <InputRightElement>
                  <Button
                    variant="ghost"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon
                      as={showPassword ? FaEyeSlash : FaEye}
                      color="gray.500"
                    />
                  </Button>
                </InputRightElement>
              </InputGroup>
              {errors.newPassword && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {errors.newPassword.message}
                </Text>
              )}
            </FormControl>
            
            <FormControl isInvalid={!!errors.confirmNewPassword}>
              <FormLabel>Confirm New Password</FormLabel>
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('confirmNewPassword', {
                  validate: (value) =>
                    !newPassword || value === newPassword || 'Passwords do not match',
                })}
              />
              {errors.confirmNewPassword && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {errors.confirmNewPassword.message}
                </Text>
              )}
            </FormControl>
            
            <HStack spacing={4} justify="flex-end">
              <Button
                variant="outline"
                colorScheme="red"
                onClick={onOpen}
              >
                Sign Out
              </Button>
              
              <Button
                type="submit"
                colorScheme="brand"
                isLoading={mutation.isLoading}
                isDisabled={!isDirty}
              >
                Save Changes
              </Button>
            </HStack>
          </VStack>
        </form>
      </Box>

      {/* MFC Cookie Management Section */}
      <Box bg={cookieBg} p={6} borderRadius="lg" shadow="md" mt={6} borderWidth="1px">
        <FormControl>
          <FormLabel>
            <HStack spacing={2}>
              <FaLock />
              <Text>MFC Session Cookies</Text>
              <Text fontSize="xs" color={subTextColor}>(Optional - for NSFW/Private content)</Text>
              {cookiesStored && (
                <Badge colorScheme="green" fontSize="xs" ml={2}>
                  <HStack spacing={1}>
                    <FaLock size={10} />
                    <Text>Stored</Text>
                  </HStack>
                </Badge>
              )}
            </HStack>
          </FormLabel>

          <Textarea
            value={mfcAuthCookies}
            onChange={(e) => setMfcAuthCookies(e.target.value)}
            placeholder="Paste MFC session cookies here from the bookmarklet below"
            size="sm"
            rows={3}
          />

          {/* Collapsible Help Section - Bookmarklet Only */}
          <Box mt={3}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowHelp(!showHelp)}
              rightIcon={showHelp ? <FaChevronUp /> : <FaChevronDown />}
              width="full"
              justifyContent="space-between"
            >
              <HStack>
                <FaQuestionCircle />
                <Text>How to get MFC cookies</Text>
              </HStack>
            </Button>
            <Collapse in={showHelp} animateOpacity>
              <Box mt={2} p={3} bg={helpBg} borderRadius="md">
                {isLoadingConfigs ? (
                  <Spinner size="sm" />
                ) : mfcConfigs.mfc_cookie_instructions?.value || mfcConfigs.mfc_cookie_script?.value ? (
                  // Dynamic content from admin config
                  <Box fontSize="sm" whiteSpace="pre-wrap">
                    {mfcConfigs.mfc_cookie_instructions?.value &&
                      mfcConfigs.mfc_cookie_instructions.value.split('\\n').map((line, idx) => (
                        <Text key={idx} mb={line.startsWith('#') ? 2 : 1} fontWeight={line.startsWith('#') ? 'bold' : 'normal'}>
                          {line.replace(/^#+\s*/, '')}
                        </Text>
                      ))
                    }
                    {mfcConfigs.mfc_cookie_script?.value && (
                      <Code fontSize="xs" p={2} display="block" whiteSpace="pre-wrap" mt={2}>
                        {mfcConfigs.mfc_cookie_script.value}
                      </Code>
                    )}
                  </Box>
                ) : (
                  <Text fontSize="sm" color="gray.500">
                    Instructions not available. Please contact an administrator.
                  </Text>
                )}
              </Box>
            </Collapse>
          </Box>

          {/* Storage Options - Session and Persistent Only */}
          <Box mt={3}>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
              Storage Option:
              <Text as="span" ml={2} color={storageTextColor}>
                {storageType === 'session' && 'Session (cleared on logout)'}
                {storageType === 'persistent' && 'Persistent (encrypted)'}
              </Text>
            </Text>
            <RadioGroup value={storageType} onChange={(value) => setStorageType(value as StorageType)}>
              <Stack direction="column" spacing={2}>
                <Radio value="session" size="sm">
                  <Tooltip label="Stored in browser session - cleared when you log out">
                    <Text fontSize="sm">Remember for this session (cleared on logout)</Text>
                  </Tooltip>
                </Radio>
                <Radio value="persistent" size="sm">
                  <Tooltip label="Encrypted and stored in browser - persists until manually cleared">
                    <Text fontSize="sm">Remember until cleared (encrypted storage)</Text>
                  </Tooltip>
                </Radio>
              </Stack>
            </RadioGroup>
          </Box>

          {/* Clear Cookies Button */}
          <HStack mt={3} spacing={2}>
            <Button
              size="sm"
              leftIcon={<FaTrash />}
              colorScheme="red"
              variant="outline"
              onClick={handleClearCookies}
              isDisabled={!cookiesStored}
            >
              Clear MFC Cookies
            </Button>
          </HStack>

          {/* Collapsible Security Section */}
          <Box mt={3}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSecurity(!showSecurity)}
              rightIcon={showSecurity ? <FaChevronUp /> : <FaChevronDown />}
              width="full"
              justifyContent="space-between"
            >
              <HStack>
                <FaLock />
                <Text>Security & Privacy</Text>
              </HStack>
            </Button>
            <Collapse in={showSecurity} animateOpacity>
              <Alert status="info" mt={2} borderRadius="md">
                <AlertIcon />
                <Box fontSize="xs">
                  <Text fontWeight="bold" mb={2}>🔒 Security & Privacy</Text>
                  <Text mb={2}>
                    When provided, MFC cookies are encrypted and stored only in your browser's localStorage.
                    They are securely transmitted to our services when scraping, as MFC requires your
                    authenticated session to authorize your access to:
                  </Text>
                  <Text as="ul" pl={4} mb={2}>
                    <li>NSFW/NSFW+ restricted content</li>
                    <li>Your MFC Manager catalog (for bulk import/sync)</li>
                    <li>Other authorized private or restricted items on MFC</li>
                  </Text>
                  <Text mb={2}>
                    <strong>Our services immediately discard your cookies after retrieving the data</strong>—they
                    are never stored on our servers. All services are open source for full transparency.
                  </Text>
                  <Text fontWeight="medium" mb={1}>Browser Storage Options:</Text>
                  <Text fontSize="sm" mb={2} fontStyle="italic">
                    (These options control how your cookies are stored <em>in your browser</em>, not on our servers)
                  </Text>
                  <Text as="ul" pl={4} mb={2}>
                    <li>Remember for this session: Stored in browser session—cleared when you log out</li>
                    <li>Remember until cleared: Encrypted in browser localStorage—persisted until you manually clear them</li>
                  </Text>
                  <Text mb={2}>
                    You can always clear stored cookies manually using the "Clear MFC Cookies" button.
                    No cookies are stored if that button is disabled.
                  </Text>
                  <Text mb={2}>
                    <strong>Note:</strong> Content retrieval is subject to your MFC account's content access
                    permissions. MFC enforces age-restricted content access based on your account settings,
                    ensuring legal compliance.
                  </Text>
                  <Text fontWeight="bold" color={warningColor}>
                    ⚠️ Important: Never share your MFC cookies with anyone—they provide access to your MFC account.
                  </Text>
                </Box>
              </Alert>
            </Collapse>
          </Box>
        </FormControl>
      </Box>

      {/* Logout Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Sign Out</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            Are you sure you want to sign out?
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleLogout}>
              Sign Out
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Profile;
