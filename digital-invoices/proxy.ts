// Entrada desde el inicio de Seven Suite con ?empresa=…: guarda la empresa en
// su cookie (decide el país y la base de datos) y quita el parámetro, para que
// la primera pantalla ya se dibuje con esa empresa.
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_EMPRESA, empresaValida } from '@/lib/empresas';

export function proxy(request: NextRequest) {
  const empresa = request.nextUrl.searchParams.get('empresa');
  if (empresa === null) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.searchParams.delete('empresa');
  const respuesta = NextResponse.redirect(url);
  if (empresaValida(empresa)) respuesta.cookies.set(COOKIE_EMPRESA, empresa, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  return respuesta;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
