// Importado primeiro em main.tsx: desliga o teste de `new Function` do zod antes de qualquer schema
// ser usado, porque a CSP da implantação não tem 'unsafe-eval' (deploy/nginx.conf).
import { z } from 'zod'

z.config({ jitless: true })
