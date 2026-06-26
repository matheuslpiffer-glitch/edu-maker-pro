import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Beaker, Library } from 'lucide-react';
import HubGrid, { type HubItem } from './HubGrid';

function renderHub(items: HubItem[]) {
  return render(
    <MemoryRouter initialEntries={['/hub']}>
      <Routes>
        <Route
          path="/hub"
          element={
            <HubGrid title="Hub Teste" subtitle="Subtítulo" icon={Library} items={items} />
          }
        />
        <Route path="/destino-a" element={<div>Página A</div>} />
        <Route path="/destino-b" element={<div>Página B</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('HubGrid', () => {
  it('renderiza título, subtítulo e cards', () => {
    renderHub([
      { to: '/destino-a', icon: Beaker, title: 'Item A', desc: 'Descrição A' },
      { to: '/destino-b', icon: Beaker, title: 'Item B', desc: 'Descrição B' },
    ]);
    expect(screen.getByRole('heading', { name: 'Hub Teste' })).toBeInTheDocument();
    expect(screen.getByText('Subtítulo')).toBeInTheDocument();
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item B')).toBeInTheDocument();
  });

  it('navega ao caminho do card quando clicado', () => {
    renderHub([
      { to: '/destino-a', icon: Beaker, title: 'Item A', desc: 'Descrição A' },
      { to: '/destino-b', icon: Beaker, title: 'Item B', desc: 'Descrição B' },
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Item B/ }));
    expect(screen.getByText('Página B')).toBeInTheDocument();
  });

  it('exibe estado vazio amigável quando items é vazio', () => {
    renderHub([]);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Nada por aqui ainda')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('Hub pages roteamento', () => {
  const cases: Array<{ path: string; loader: () => Promise<{ default: React.ComponentType }>; heading: RegExp; sampleTo: string; sampleLabel: RegExp }> = [
    {
      path: '/redacao-hub',
      loader: () => import('@/pages/HubRedacao'),
      heading: /^Redação$/,
      sampleTo: '/redacao',
      sampleLabel: /Redação Elite/,
    },
    {
      path: '/criar-hub',
      loader: () => import('@/pages/HubCriar'),
      heading: /Criar Conteúdo/,
      sampleTo: '/mapas-mentais',
      sampleLabel: /Mapas Mentais Maker/,
    },
    {
      path: '/avaliacoes-hub',
      loader: () => import('@/pages/HubAvaliacoes'),
      heading: /Simulados & Avaliações/,
      sampleTo: '/alta-performance',
      sampleLabel: /Módulo Alta Performance/,
    },
    {
      path: '/biblioteca-hub',
      loader: () => import('@/pages/HubBiblioteca'),
      heading: /^Biblioteca$/,
      sampleTo: '/minha-biblioteca',
      sampleLabel: /Minha Biblioteca/,
    },
  ];

  for (const c of cases) {
    it(`${c.path} renderiza a página e navega para um destino esperado`, async () => {
      const mod = await c.loader();
      const Page = mod.default;
      render(
        <MemoryRouter initialEntries={[c.path]}>
          <Routes>
            <Route path={c.path} element={<Page />} />
            <Route path={c.sampleTo} element={<div>destino-ok</div>} />
            <Route path="*" element={<div>fallback</div>} />
          </Routes>
        </MemoryRouter>
      );
      expect(screen.getByRole('heading', { name: c.heading })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: c.sampleLabel }));
      expect(screen.getByText('destino-ok')).toBeInTheDocument();
    });
  }
});

// Silenciar eventuais warnings de router future flags em testes
vi.spyOn(console, 'warn').mockImplementation(() => {});