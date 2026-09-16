import { fetchApi } from '@libs/fetch';
import { FilterToValues, Filters } from '@libs/filterInputs';
import { Plugin } from '@/types/plugin';
import { NovelStatus } from '@libs/novelStatus';
import dayjs from 'dayjs';

export type RulateMetadata = {
  id: string;
  sourceSite: string;
  sourceName: string;
  filters?: Filters;
  versionIncrements: number;
  key: string;
};

const headers = {
  'User-Agent': 'RuLateApp Android',
  'accept-encoding': 'gzip',
};

export class RulatePlugin implements Plugin.PluginBase {
  id: string;
  name: string;
  icon: string;
  site: string;
  version: string;
  filters?: Filters | undefined;
  key: string;

  constructor(metadata: RulateMetadata) {
    this.id = metadata.id;
    this.name = metadata.sourceName + ' (API)';
    this.icon = `multisrc/rulate/${metadata.id.toLowerCase()}/icon.png`;
    this.site = metadata.sourceSite;
    this.version = '1.0.' + (1 + metadata.versionIncrements);
    this.filters = metadata.filters;
    this.key = metadata.key;
  }

  parseNovels(url: string) {
    return fetchApi(url, { headers })
      .then((res: Response) => res.json() as Promise<SearchResponse>)
      .then((data: SearchResponse) => {
        const novels: Plugin.NovelItem[] = [];

        if (data.status === 'success' && data.response?.length) {
          data.response.forEach(novel =>
            novels.push({
              name: novel.t_title || novel.s_title,
              path: novel.id.toString(),
              cover: novel.img,
            }),
          );
        }

        return novels;
      });
  }

  async popularNovels(
    page: number,
    {
      filters,
      showLatestNovels,
    }: Plugin.PopularNovelsOptions<typeof this.filters>,
  ): Promise<Plugin.NovelItem[]> {
    let url = this.site + '/api3/searchBooks?limit=40&page=' + page;
    url += '&sort=' + (showLatestNovels ? '4' : filters?.sort?.value || '6');

    Object.entries(filters || {}).forEach(([type, filter]) => {
      const { value } = filter as FilterToValues<Filters>[string];
      if (value instanceof Array && value.length) {
        url += '&' + value.map(val => type + '[]=' + val).join('&');
      }
    });

    url += '&key=' + this.key;
    return this.parseNovels(url);
  }

  async searchNovels(
    searchTerm: string,
    page = 1,
  ): Promise<Plugin.NovelItem[]> {
    const url = `${this.site}/api3/searchBooks?t=${encodeURIComponent(
      searchTerm,
    )}&limit=40&page=${page}&key=${this.key}`;
    return this.parseNovels(url);
  }

  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    const book = await fetchApi(
      this.site + '/api3/book?book_id=' + novelPath + '&key=' + this.key,
      { headers },
    ).then((res: Response) => res.json() as Promise<BookResponse>);

    const novel: Plugin.SourceNovel = {
      name: book.response.t_title || book.response.s_title,
      path: novelPath,
      cover: book.response.img,
      genres: [book.response.genres, book.response.tags]
        .flatMap(c =>
          c?.map?.((g: { title?: string; name?: string }) => g.title || g.name),
        )
        .join(','),
      summary: book.response.description,
      author: book.response.author,
      status:
        book.response.status === 'Завершён'
          ? NovelStatus.Completed
          : NovelStatus.Ongoing,
      rating:
        book.response.rate && book.response.rate.count > 0
          ? Number(
              (book.response.rate.sum / book.response.rate.count).toFixed(2),
            )
          : undefined,
    };

    const chaptersData = await fetchApi(
      this.site +
        '/api3/bookChapters?book_id=' +
        novelPath +
        '&key=' +
        this.key,
      { headers },
    ).then((res: Response) => res.json() as Promise<ChaptersResponse>);

    const chapters: Plugin.ChapterItem[] = [];

    if (chaptersData.response && Array.isArray(chaptersData.response)) {
      chaptersData.response.forEach((chapter: ChapterResponse) => {
        if (chapter.can_read && chapter.subscription === 0) {
          chapters.push({
            name: chapter.title + (chapter.illustrated ? ' 🖼️' : ''),
            path: novelPath + '/' + chapter.id,
            releaseTime: dayjs(chapter.cdate * 1000).format('LLL'),
            chapterNumber: chapter.ord,
          });
        }
      });
    }

    novel.chapters = chapters;
    return novel;
  }

  async parseChapter(chapterPath: string): Promise<string> {
    const [book, chapter] = chapterPath.split('/');
    const body = await fetchApi(
      this.site +
        '/api3/chapter?book_id=' +
        book +
        '&chapter_id=' +
        chapter +
        '&key=' +
        this.key,
      { headers },
    ).then((res: Response) => res.json() as Promise<ChapterTextResponse>);

    return body.response.text;
  }
  resolveUrl = (path: string, isNovel?: boolean) =>
    this.site + '/book/' + path + (isNovel ? '/' : '/ready_new');
}

type SearchResponse = {
  status: string;
  response: {
    t_title?: string;
    s_title: string;
    id: number;
    img: string;
  }[];
};

type BookResponse = {
  response: {
    t_title?: string;
    s_title: string;
    img: string;
    cat?: { title: string }[];
    genres?: { title: string }[];
    tags?: { name: string }[];
    description: string;
    author: string;
    status: string;
    rate?: { sum: number; count: number };
  };
};

type ChapterResponse = {
  title: string;
  id: number;
  ord: number;
  cdate: number;
  subscription: number;
  can_read: boolean;
  illustrated?: boolean;
};

type ChaptersResponse = {
  response: ChapterResponse[];
};

type ChapterTextResponse = {
  response: {
    text: string;
  };
};

const plugin = new RulatePlugin({"id":"erolate-api","sourceSite":"https://erolate.com","sourceName":"Erolate","versionIncrements":0,"key":"fpoiKLUues81werht039","filters":{"sort":{"label":"Сортировка:","value":"6","options":[{"label":"По рейтингу","value":"6"},{"label":"По дате последней активности","value":"4"},{"label":"По дате создания","value":"3"},{"label":"По кол-ву бесплатных глав","value":"11"},{"label":"По кол-ву в закладках","value":"13"},{"label":"По кол-ву в избранном","value":"14"},{"label":"По кол-ву лайков","value":"8"},{"label":"По кол-ву переведённых глав","value":"7"},{"label":"По кол-ву рецензий","value":"12"},{"label":"По кол-ву страниц","value":"10"},{"label":"По названию на языке оригинала","value":"1"},{"label":"По названию на языке перевода","value":"2"},{"label":"По просмотрам","value":"5"},{"label":"По степени готовности","value":"0"},{"label":"Случайно","value":"9"}],"type":"Picker"},"genres":{"type":"Checkbox","label":"Жанры: все жанры любой жанр","value":"","options":[{"label":"анал","value":"2"},{"label":"Арт","value":"70"},{"label":"бдсм","value":"3"},{"label":"Боевые искусства","value":"52"},{"label":"большая грудь","value":"5"},{"label":"большая попка","value":"6"},{"label":"большой член","value":"7"},{"label":"бондаж","value":"8"},{"label":"в первый раз","value":"9"},{"label":"в цвете","value":"10"},{"label":"гарем","value":"11"},{"label":"Гарем","value":"71"},{"label":"гендарная интрига","value":"12"},{"label":"Героическое фэнтези","value":"57"},{"label":"групповой секс","value":"13"},{"label":"детектив","value":"39"},{"label":"Детектив","value":"50"},{"label":"Дзёсэй","value":"45"},{"label":"драма","value":"14"},{"label":"Драма","value":"46"},{"label":"зрелые женщины (milf)","value":"15"},{"label":"измена","value":"16"},{"label":"изнасилование","value":"17"},{"label":"инцест","value":"18"},{"label":"исторический","value":"19"},{"label":"История","value":"62"},{"label":"комедия","value":"20"},{"label":"Комедия","value":"51"},{"label":"контроль над разумом","value":"35"},{"label":"маленькая грудь","value":"21"},{"label":"мистика","value":"40"},{"label":"Мистика","value":"66"},{"label":"Мурим","value":"54"},{"label":"научная фантастика","value":"22"},{"label":"Научная фантастика","value":"72"},{"label":"нетораре","value":"23"},{"label":"оральный секс","value":"24"},{"label":"повседневность","value":"41"},{"label":"Повседневность","value":"53"},{"label":"Постапокалиптика","value":"55"},{"label":"приключения","value":"38"},{"label":"Приключения","value":"42"},{"label":"Психология","value":"63"},{"label":"публичный секс","value":"33"},{"label":"романтика","value":"25"},{"label":"Романтика","value":"47"},{"label":"с изображениями ","value":"36"},{"label":"сверхъестественное","value":"34"},{"label":"Сверхъестественное","value":"58"},{"label":"Сёдзё","value":"48"},{"label":"Сёнэн","value":"43"},{"label":"смат","value":"37"},{"label":"Спорт","value":"65"},{"label":"Сэйнэн","value":"64"},{"label":"тентакли","value":"26"},{"label":"трагедия","value":"27"},{"label":"Трагедия","value":"61"},{"label":"Триллер","value":"69"},{"label":"ужасы","value":"28"},{"label":"Ужасы","value":"68"},{"label":"фантастика","value":"32"},{"label":"Фантастика","value":"60"},{"label":"фэнтези","value":"29"},{"label":"Фэнтези","value":"44"},{"label":"чикан","value":"30"},{"label":"Школьная жизнь","value":"59"},{"label":"Экшен","value":"49"},{"label":"Эротика","value":"56"},{"label":"этти","value":"31"},{"label":"Этти","value":"67"},{"label":"ahegao","value":"1"}]}}});
export default plugin;