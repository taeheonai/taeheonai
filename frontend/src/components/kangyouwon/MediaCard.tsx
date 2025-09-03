// src/component/MediaCard.tsx

export type MediaItem = {
    id: string | number;
    title: string;
    keyword: string;     // 검색 키워드
    url: string;         // 기사 URL
    publishedAt?: string;
  };
  
  type Props = { item: MediaItem };
  
  export function MediaCard({ item }: Props) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="block bg-white rounded-xl shadow hover:shadow-lg transition p-5"
        title={item.title}
      >
        <div className="text-sm text-gray-500 mb-2">
          {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ''}
        </div>
        <h3 className="text-base md:text-lg font-semibold text-gray-900 line-clamp-2 mb-2">
          {item.title}
        </h3>
        <div className="text-xs text-gray-600">
          검색 키워드:{' '}
          <span className="font-medium text-gray-800">{item.keyword}</span>
        </div>
      </a>
    );
  }
  