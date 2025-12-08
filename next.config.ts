import type { NextConfig } from 'next'

// Set to '' for custom domain (programmebudget.info), or '/un-budget-explorer' for GitHub Pages subdirectory
// When using a custom domain with GitHub Pages, basePath should be empty
const basePath = process.env.NODE_ENV === 'production' ? (process.env.BASE_PATH || '') : ''

// NOTE: use basePath variable for Image src 
// https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath#images

const nextConfig: NextConfig = {
    output: 'export',
    trailingSlash: true,
    basePath: basePath,
    assetPrefix: basePath,
    reactStrictMode: true,
    poweredByHeader: false,
    images: {
        unoptimized: true
    },
    env: {
        NEXT_PUBLIC_BASE_PATH: basePath,
    },
}

export default nextConfig