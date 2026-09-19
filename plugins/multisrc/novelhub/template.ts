import { fetchApi } from '@libs/fetch';
import { Filters, FilterToValues } from '@libs/filterInputs';
import { Plugin } from '@/types/plugin';
import { NovelStatus } from '@libs/novelStatus';
import { Parser } from 'htmlparser2';
import dayjs from 'dayjs';

export type NovelhubMetadata = {
  id: string;
  sourceSite: string;
  sourceName: string;
  filters?: Filters;
};

export class NovelhubPlugin implements Plugin.PluginBase {
  id: string;
  name: string;
  icon: string;
  site: string;
  version: string;
  filters?: Filters;

  constructor(metadata: NovelhubMetadata) {
    this.id = metadata.id;
    this.name = metadata.sourceName;
    this.icon = `multisrc/novelhub/${metadata.id.toLowerCase()}/icon.png`;
    this.site = metadata.sourceSite;
    this.version = '1.0.0';
    this.filters = metadata.filters;
  }

  parseNovels(url: string) {
    return fetchApi(url)
      .then((res: Response) => res.text())
      .then((html: string) => {
        const novels: Plugin.NovelItem[] = [];
        let tempNovel = {} as Plugin.NovelItem;
        let isInsideNovelCard = false;
        const site = this.site;

        const parser = new Parser({
          onopentag(name, attribs) {
            const className = attribs['class'] || '';
            if (name === 'div' && className.includes('novel-card')) {
              isInsideNovelCard = true;
            }

            if (isInsideNovelCard) {
              if (name === 'img') {
                tempNovel.cover = attribs['src'];
                if (attribs['alt']) tempNovel.name = attribs['alt'];
              }
              if (name === 'a' && attribs['href']) {
                tempNovel.path = attribs['href'].replace(site, '');
                if (attribs['title']) tempNovel.name = attribs['title'];
              }
            }
          },
          onclosetag(name) {
            if (name === 'div' && isInsideNovelCard) {
              isInsideNovelCard = false;
              if (tempNovel.path) novels.push(tempNovel);
              tempNovel = {} as Plugin.NovelItem;
            }
          },
        });
        parser.write(html);
        parser.end();
        return novels;
      });
  }

  async popularNovels(page: number, { filters, showLatestNovels }: Plugin.PopularNovelsOptions<typeof this.filters>): Promise<Plugin.NovelItem[]> {
    let url = `${this.site}/popular?sort=${showLatestNovels ? 'latest' : filters?.sort?.value || 'popular'}`;

    Object.entries(filters || {}).forEach(([type, filter]) => {
      const { value } = filter as FilterToValues<Filters>[string];
      if (Array.isArray(value) && value.length) {
        url += `&${type}[]=${value.join(`&${type}[]=`)}`;
      }
    });

    url += `&page=${page}`;
    return this.parseNovels(url);
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const html = await fetchApi(this.site + novelPath).then((res: Response) => res.text());
    const novel: Plugin.SourceNovel = {
      path: novelPath,
      name: '',
      author: '',
      summary: '',
      status: NovelStatus.Unknown,
    };
    const chapters: Plugin.ChapterItem[] = [];
    const genres: string[] = [];
    const site = this.site;

    let isReadingName = false;
    let isReadingSummary = false;
    let isCoverContainer = false;

    let metaContext: 'author' | 'status' | 'genre' | null = null;
    let isMetaRow = false;
    let isMetaValue = false;

    let isInsideChapterRow = false;
    let isReadingChapterName = false;

    const parser = new Parser({
      onopentag(name, attribs) {
        const className = attribs['class'] || '';

        if (name === 'h1') isReadingName = true;

        if (name === 'div') {
          if (className.includes('novel-cover')) {
            isCoverContainer = true;
          }
          if (className.includes('novel-summary')) {
            isReadingSummary = true;
          }
        }

        if (name === 'div' && className.includes('meta-info')) {
          isMetaRow = true;
          metaContext = null;
        }
      },
      ontext(data) {
        const text = data.trim();
        if (!text) return;

        if (isReadingName) novel.name = text;
        if (isReadingSummary) novel.summary += text + '\n';

        if (metaContext) {
          if (metaContext === 'author') novel.author = text;
          else if (metaContext === 'status') novel.status = parseStatus(text);
          else if (metaContext === 'genre') genres.push(text);
        }
      },
      onclosetag(name) {
        if (name === 'h1') isReadingName = false;
        if (name === 'div') {
          if (isReadingSummary) isReadingSummary = false;
          if (isCoverContainer) isCoverContainer = false;
          if (isMetaRow) isMetaRow = false;
        }
      },
    });

    parser.write(html);
    parser.end();

    novel.genres = genres.join(',');
    return novel;
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const body = await fetchApi(this.site + chapterPath).then((res: Response) => res.text());
    const startTag = '<div class="chapter-content">';
    const endTag = '<div class="chapter-footer">';

    const chapterStart = body.indexOf(startTag);
    if (chapterStart === -1) return '';

    const chapterEnd = body.indexOf(endTag, chapterStart);
    let chapterText = body.slice(chapterStart, chapterEnd !== -1 ? chapterEnd : undefined);

    chapterText = chapterText.replace(/<script[^>]*>[\s\S]*?<\/script>/gim, '');
    return chapterText;
  }

  async searchNovels(searchTerm: string, page = 1): Promise<Plugin.NovelItem[]> {
    const url = `${this.site}/search?query=${encodeURIComponent(searchTerm)}&page=${page}`;
    return this.parseNovels(url);
  }
}

function parseStatus(statusString: string): string {
  const s = statusString.toLowerCase().trim();
  if (s.includes('активен') || s.includes('продолжается')) {
    return NovelStatus.Ongoing;
  } else if (s.includes('завершен')) {
    return NovelStatus.Completed;
  }
  return NovelStatus.Unknown;
}