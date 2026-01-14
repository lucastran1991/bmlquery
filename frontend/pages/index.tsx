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
} from '@chakra-ui/react';
import { DeleteIcon, AddIcon } from '@chakra-ui/icons';

interface ModelData {
  name: string;
  attributes: string[];
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
  const toast = useToast();

  useEffect(() => {
    fetchModels();
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

  return (
    <Container maxW="container.xl" py={10}>
      <VStack spacing={8} align="stretch">
        <Heading as="h1" size="xl" textAlign="center" color="red.500">
          BML Query Generator
        </Heading>

        <Box as="form" onSubmit={handleSubmit} p={6} borderWidth={1} borderRadius="lg" boxShadow="lg" bg="white">
          <VStack spacing={6}>
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
            <Heading as="h3" size="md" mb={4}>Generated YAML:</Heading>
            <Code display="block" whiteSpace="pre" p={4} children={result} />
          </Box>
        )}
      </VStack>
    </Container>
  );
}

