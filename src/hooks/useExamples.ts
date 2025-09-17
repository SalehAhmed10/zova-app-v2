import { useState, useEffect } from 'react';

// Mock data for FlashList example
export function useExampleData() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      setLoading(true);
      // Mock data
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        id: i.toString(),
        title: `Item ${i + 1}`,
        description: `This is the description for item ${i + 1}`,
        image: `https://picsum.photos/200/200?random=${i}`,
      }));

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setData(mockData);
      setLoading(false);
    };

    fetchData();
  }, []);

  return { data, loading };
}

// Mock form submission hook
export function useFormExample() {
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSubmittedData(data);
    setLoading(false);
  };

  return { submittedData, loading, handleSubmit };
}