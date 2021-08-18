/* eslint-disable no-param-reassign */
/* eslint-disable no-return-assign */
import Head from 'next/head';
import { GetStaticPaths, GetStaticProps } from 'next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { useRouter } from 'next/router';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Link from 'next/link';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

// aqui faz a tipagem das props que são recebidas
interface PostProps {
  post: Post;
  suggestPosts: {
    previousPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
    laterPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
  };
}

export default function Post({ post, suggestPosts }: PostProps): JSX.Element {
  const router = useRouter();
  console.log(suggestPosts);

  const totalWords = post.data.content.reduce((total, item) => {
    total += item.heading.split(' ').length;

    const words = item.body.map(elemento => elemento.text.split(' ').length);
    words.map(word => {
      return (total += word);
    });
    return total;
  }, 0);

  const readTime = Math.ceil(totalWords / 200);

  const formatedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }
  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling</title>
      </Head>
      <Header />
      <main className={styles.container}>
        <div>
          <img
            src={post.data.banner.url}
            alt={`imagem - ${post.data.title}`}
            title={`imagem - ${post.data.title}`}
          />
        </div>
        <div className={`${commonStyles.container} ${styles.postContainer}`}>
          <div>
            <h1>{post.data.title}</h1>
            <ul>
              <li>
                <FiCalendar />
                <span>{formatedDate}</span>
              </li>
              <li>
                <FiUser />
                <span>{post.data.author}</span>
              </li>
              <li>
                <FiClock />
                <span>{`${readTime} min`}</span>
              </li>
            </ul>
          </div>

          {post.data.content.map(content => {
            return (
              <article key={content.heading}>
                <h2>{content.heading}</h2>
                <div
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                />
              </article>
            );
          })}
        </div>
        <section className={`${commonStyles.container} ${styles.suggestPosts}`}>
          {suggestPosts.previousPost && suggestPosts.previousPost.length > 0 && (
            <Link
              href={`/post/${suggestPosts.previousPost[0]?.uid}`}
              key={suggestPosts.previousPost[0]?.uid}
            >
              <div>
                <a>
                  <strong>{suggestPosts.previousPost[0]?.data.title}</strong>
                  <p>Post anterior</p>
                </a>
              </div>
            </Link>
          )}

          {suggestPosts.laterPost && suggestPosts.laterPost.length > 0 && (
            <Link
              href={`/post/${suggestPosts.laterPost[0]?.uid}`}
              key={suggestPosts.laterPost[0]?.uid}
            >
              <div>
                <a>
                  <strong>{suggestPosts.laterPost[0]?.data.title}</strong>
                  <p>Próximo Post</p>
                </a>
              </div>
            </Link>
          )}
        </section>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts'),
  ]);

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();
  const { slug } = context.params;
  const response = await prismic.getByUID('posts', String(slug), {});

  const previousPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const laterPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date desc]',
    }
  );

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  // aqui são as props que estou enviando para o post
  return {
    props: {
      post,
      suggestPosts: {
        previousPost: previousPost?.results,
        laterPost: laterPost?.results,
      },
    },
  };
};
