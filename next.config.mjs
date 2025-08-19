/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suprimir advertencias conocidas de Supabase
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('canvas');
    } else {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        canvas: false,
      }
    }
    
    // Suprimir advertencias específicas de Supabase Realtime y PDF.js
    config.ignoreWarnings = [
      {
        module: /node_modules\/@supabase\/realtime-js/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
      {
        module: /node_modules\/pdfjs-dist/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ]
    
    return config
  },
  
  // Optimizaciones de producción
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', '@supabase/ssr', 'lucide-react', 'recharts', 'pdfjs-dist', 'xlsx'],
  },
  
  // Configuración para mejor rendimiento
  compress: true,
  poweredByHeader: false,

  // Updates to be made
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
