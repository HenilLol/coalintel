import { apiClient } from './client';

export interface WordCloudTopicItem {
  word: string;
  weight: number;
  category: string;
}

export interface WordCloudResponse {
  topics: WordCloudTopicItem[];
}

export const analyticsApi = {
  getWordCloud: async (): Promise<WordCloudResponse> => {
    const response = await apiClient.get<WordCloudResponse>('/analytics/wordcloud');
    return response.data;
  },
};
