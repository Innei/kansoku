import type { NewsItem } from "../../../shared/types";
import { Badge, SectionTitle } from "../ui";

const newsTime = (iso: string) => iso.slice(5, 16).replace("T", " ");

export function NewsSection({ news }: { news: NewsItem[] }) {
  if (!news.length) return null;

  return (
    <>
      <SectionTitle>相关新闻</SectionTitle>
      {news.map((n) => {
        const community = n.url.includes("/topics/");
        return (
          <a key={n.id} className="news-item" href={n.url} target="_blank" rel="noreferrer">
            <span className="news-meta">
              {newsTime(n.published_at)}
              <Badge>{community ? "社区" : "新闻"}</Badge>
            </span>
            <span className="news-title">{n.title}</span>
          </a>
        );
      })}
      <div className="note-block">社区帖为用户观点，非权威信源；引用数据前先核对原始来源</div>
    </>
  );
}
