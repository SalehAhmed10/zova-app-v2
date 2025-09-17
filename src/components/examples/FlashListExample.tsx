import React from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { FlashList } from '@shopify/flash-list';
import { TouchableOpacity } from 'react-native';

interface Item {
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

interface FlashListExampleProps {
  data: Item[];
  onItemPress?: (item: Item) => void;
  estimatedItemSize?: number;
}

export function FlashListExample({
  data,
  onItemPress,
  estimatedItemSize = 120
}: FlashListExampleProps) {
  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      onPress={() => onItemPress?.(item)}
      className="mx-4 mb-3"
    >
      <Card>
        <CardContent className="p-4">
          <Text variant="h4" className="mb-2">
            {item.title}
          </Text>
          <Text variant="muted" className="mb-2">
            {item.description}
          </Text>
          <Text variant="small" className="text-muted-foreground">
            {new Date(item.timestamp).toLocaleDateString()}
          </Text>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View className="items-center justify-center py-12">
      <Text variant="muted" className="text-center">
        No items to display
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View className="px-4 py-4">
      <Text variant="h3" className="mb-2">
        Items List
      </Text>
      <Text variant="muted">
        {data.length} item{data.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      ListEmptyComponent={renderEmpty}
      ListHeaderComponent={renderHeader}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 }}
      keyExtractor={(item) => item.id}
    />
  );
}

// Example usage hook
export function useExampleData() {
  const [data, setData] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      setLoading(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockData: Item[] = Array.from({ length: 50 }, (_, index) => ({
        id: `item-${index + 1}`,
        title: `Item ${index + 1}`,
        description: `This is a description for item ${index + 1}. It contains some sample text to demonstrate how the FlashList handles different content lengths.`,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      setData(mockData);
      setLoading(false);
    };

    fetchData();
  }, []);

  return { data, loading };
}