import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  Heading,
  Code,
  useToast,
  HStack,
  IconButton,
  Tooltip,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  List,
  ListItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Text,
  Flex,
} from '@chakra-ui/react';
import { DeleteIcon, AddIcon, HamburgerIcon, CheckIcon } from '@chakra-ui/icons';

interface ModelData {
  name: string;
  attributes: string[];
}

interface SavedQuery {
  id: number;
  name: string;
}

export default function Home() {
  const [formData, setFormData] = useState({
    function: 'find',
    model: ''
  });
  const [filters, setFilters] = useState([
    { attribute: '', condition: 'eq', conditionValue: '' }
  ]);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<ModelData[]>([]);
  const [availableAttributes, setAvailableAttributes] = useState<string[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [currentQueryId, setCurrentQueryId] = useState<number | null>(null);
  const [queryName, setQueryName] = useState('');
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isSaveModalOpen, onOpen: onSaveModalOpen, onClose: onSaveModalClose } = useDisclosure();

  useEffect(() => {
    fetchModels();
    fetchSavedQueries();
  }, []);

  useEffect(() => {
    if (formData.model) {
      const selectedModel = models.find(m => m.name === formData.model);
      setAvailableAttributes(selectedModel ? selectedModel.attributes : []);
      // Reset filters if model changes
      setFilters([{ attribute: '', condition: 'eq', conditionValue: '' }]);
    } else {
      setAvailableAttributes([]);
    }
  }, [formData.model, models]);

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models');
      if (response.ok) {
        const data = await response.json();
        setModels(data);
      } else {
        console.error('Failed to fetch models');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const fetchSavedQueries = async () => {
    try {
      const response = await fetch('/api/queries');
      if (response.ok) {
        const data = await response.json();
        setSavedQueries(data);
      }
    } catch (error) {
      console.error('Error fetching saved queries:', error);
    }
  };

  const handleFunctionModelChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFilterChange = (index: number, field: string, value: string) => {
    const newFilters = [...filters];
    // @ts-ignore
    newFilters[index][field] = value;
    setFilters(newFilters);
  };

  const addFilter = () => {
    setFilters([...filters, { attribute: '', condition: 'eq', conditionValue: '' }]);
  };

  const removeFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          function: formData.function,
          model: formData.model,
          filters: filters
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate query');
      }

      const text = await response.text();
      setResult(text);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect to backend.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuery = async () => {
    if (!queryName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a query name',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!result) {
      toast({
        title: 'Error',
        description: 'No query to save. Generate a query first.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch('/api/queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: queryName,
          query_string: result
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentQueryId(data.id);
        toast({
          title: 'Success',
          description: 'Query saved successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchSavedQueries();
        onSaveModalClose();
      } else {
        throw new Error('Failed to save query');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save query',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleLoadQuery = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8080/queries/${id}`);
      if (!response.ok) throw new Error('Failed to load query');

      const query = await response.json();
      setQueryName(query.name);
      setCurrentQueryId(query.id);
      setResult(query.query_string);

      // Parse the query to populate form
      const parseResponse = await fetch('/api/parse-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query_string: query.query_string
        }),
      });

      if (parseResponse.ok) {
        const parsed = await parseResponse.json();
        setFormData({
          function: parsed.function,
          model: parsed.model
        });
        setFilters(parsed.filters);
        onClose();
        toast({
          title: 'Success',
          description: 'Query loaded successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load query',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteQuery = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8080/queries/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Query deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchSavedQueries();
        if (currentQueryId === id) {
          setCurrentQueryId(null);
          setQueryName('');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete query',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading as="h1" size="xl" color="red.500">
            BML Query Generator
          </Heading>
          <Button leftIcon={<HamburgerIcon />} onClick={onOpen} colorScheme="red" variant="outline">
            Saved Queries ({savedQueries.length})
          </Button>
        </Flex>

        <Box as="form" onSubmit={handleSubmit} p={6} borderWidth={1} borderRadius="lg" boxShadow="lg" bg="white">
          <VStack spacing={6}>
            <HStack w="full" spacing={4}>
              <FormControl id="function" isRequired>
                <FormLabel fontWeight="bold">Function</FormLabel>
                <Select name="function" value={formData.function} onChange={handleFunctionModelChange}>
                  <option value="find">Find</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="deleteAll">Delete All</option>
                </Select>
              </FormControl>

              <FormControl id="model" isRequired>
                <FormLabel fontWeight="bold">Model</FormLabel>
                <Select name="model" placeholder="Select Model" value={formData.model} onChange={handleFunctionModelChange}>
                  {models.map((m) => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </Select>
              </FormControl>
            </HStack>

            <Box w="full">
              <HStack justify="space-between" mb={4}>
                <Heading size="md" color="red.600">Filters</Heading>
                <Button size="sm" onClick={addFilter} leftIcon={<AddIcon />} colorScheme="red" variant="outline">
                  Add Filter
                </Button>
              </HStack>

              <VStack spacing={4}>
                {filters.map((filter, index) => (
                  <Box key={index} p={4} borderWidth={1} borderRadius="md" w="full" bg="gray.50" position="relative">
                    <HStack spacing={4} align="flex-end">
                      <FormControl isRequired>
                        <FormLabel fontSize="sm" color="gray.600">Attribute</FormLabel>
                        <Select
                          placeholder="Select Attribute"
                          value={filter.attribute}
                          onChange={(e) => handleFilterChange(index, 'attribute', e.target.value)}
                          isDisabled={!formData.model}
                          bg="white"
                          focusBorderColor="red.400"
                        >
                          {availableAttributes.map((attr) => (
                            <option key={attr} value={attr}>{attr}</option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel fontSize="sm" color="gray.600">Condition</FormLabel>
                        <Select
                          value={filter.condition}
                          onChange={(e) => handleFilterChange(index, 'condition', e.target.value)}
                          bg="white"
                          focusBorderColor="red.400"
                        >
                          <option value="eq">Equal (eq)</option>
                          <option value="ne">Not Equal (ne)</option>
                          <option value="gt">Greater Than (gt)</option>
                          <option value="ge">Greater or Equal (ge)</option>
                          <option value="lt">Less Than (lt)</option>
                          <option value="le">Less or Equal (le)</option>
                        </Select>
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel fontSize="sm" color="gray.600">Value</FormLabel>
                        <Input
                          placeholder="Value"
                          value={filter.conditionValue}
                          onChange={(e) => handleFilterChange(index, 'conditionValue', e.target.value)}
                          bg="white"
                          focusBorderColor="red.400"
                        />
                      </FormControl>

                      {filters.length > 1 && (
                        <Tooltip label="Remove Filter">
                          <IconButton
                            aria-label="Remove filter"
                            icon={<DeleteIcon />}
                            size="md"
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => removeFilter(index)}
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </Box>

            <Button type="submit" colorScheme="red" width="full" size="lg" isLoading={loading} mt={4}>
              Generate Query
            </Button>
          </VStack>
        </Box>

        {result && (
          <Box p={6} borderWidth={1} borderRadius="lg" bg="gray.50">
            <HStack justify="space-between" mb={4}>
              <Heading as="h3" size="md">Generated YAML:</Heading>
              <Button leftIcon={<CheckIcon />} size="sm" colorScheme="red" onClick={onSaveModalOpen}>
                Save Query
              </Button>
            </HStack>
            <Code display="block" whiteSpace="pre" p={4} children={result} />
          </Box>
        )}
      </VStack>

      {/* Saved Queries Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">Saved Queries</DrawerHeader>
          <DrawerBody>
            {savedQueries.length === 0 ? (
              <Text color="gray.500">No saved queries yet</Text>
            ) : (
              <List spacing={3}>
                {savedQueries.map((query) => (
                  <ListItem key={query.id} p={3} borderWidth={1} borderRadius="md" bg="gray.50">
                    <HStack justify="space-between">
                      <Text
                        fontWeight="medium"
                        cursor="pointer"
                        onClick={() => handleLoadQuery(query.id)}
                        _hover={{ color: 'red.500' }}
                      >
                        {query.name}
                      </Text>
                      <IconButton
                        aria-label="Delete query"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => handleDeleteQuery(query.id)}
                      />
                    </HStack>
                  </ListItem>
                ))}
              </List>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Save Query Modal */}
      <Modal isOpen={isSaveModalOpen} onClose={onSaveModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Save Query</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Query Name</FormLabel>
              <Input
                placeholder="Enter query name"
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onSaveModalClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleSaveQuery}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}
