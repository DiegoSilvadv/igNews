import { GetStaticPaths, GetStaticProps } from "next";
import { getSession } from "next-auth/client";
import Head from "next/head";
import { RichText } from "prismic-dom";
import { getPrismicClient } from "../../../services/prismic";

import styles from '../post.module.scss';

interface PostPreviewProps {
    post: {
        slug: string;
        title: string;
        content: string;
        updatedAt: string;
    }
}

export default function PostPreview({ post }: PostPreviewProps) {
    return (
        <>
            <Head>
                <title>{post.title} | ignews</title>
            </Head>

            <main className={styles.container}>
                <article className={styles.post}>
                    <h1>{post.title}</h1>
                    <time>{post.updatedAt}</time>

                    <div 
                        className={`${styles.postContent} ${styles.previewContent}`} 
                        dangerouslySetInnerHTML={{ __html: post.content }} 
                    />
                </article>
            </main>
        </>
    )
}

//Gerando pagina estatica
export const getStaticPaths: GetStaticPaths = async() => {
    return {
        paths: [],
        fallback: 'blocking'
    }
}


export const getStaticProps: GetStaticProps = async ({ params }) => {

    const { slug } = params;

    const prismic = getPrismicClient()

    const respose = await prismic.getByUID('publication', String(slug), {})

    const post = {
        slug,
        title: RichText.asText(respose.data.title),
        content: RichText.asHtml(respose.data.content.splice(0, 3)),
        updatedAt: new Date(respose.last_publication_date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
    }

    return {
        props: {
            post,
        },
        redirect: 60 * 30, //30 minutos
    }

    // if(!session) {

    // }
}