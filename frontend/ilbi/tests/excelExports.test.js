import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('every Excel download control is absent for staff and admins, including the import template', async () => {
  const server = await createServer({
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  });
  try {
    const { default: ExcelExportButton } = await server.ssrLoadModule('/src/components/common/ExcelExportButton.jsx');
    const { default: CatalogImportModal } = await server.ssrLoadModule('/src/components/common/CatalogImportModal.jsx');
    const { default: AuthContext } = await server.ssrLoadModule('/src/context/authContext.js');
    const { ToastProvider } = await server.ssrLoadModule('/src/context/ToastContext.jsx');
    const exports = [
      ['/inventory/stock/export/', { scope: 'all' }, 'Butun omborni Excelga yuklash'],
      ['/inventory/stock/export/', { search: 'Redmi' }, 'Filtrlangan ro‘yxatni yuklash'],
      ['/sales/export/', {}, 'Savdolarni Excelga yuklash'],
      ['/sales/counterparties/export/', {}, 'Qarzlarni Excelga yuklash'],
    ];
    function render(role) {
      return renderToStaticMarkup(createElement(AuthContext.Provider, {
        value: { isOwner: role === 'owner', role, user: { permissions: ['all'] } },
      }, createElement(ToastProvider, null,
        ...exports.map(([endpoint, params, label]) => createElement(ExcelExportButton, {
          key: label, endpoint, params, label, filename: 'test.xlsx',
        })),
        createElement(CatalogImportModal, { onClose() {}, onSuccess() {} }),
      )));
    }
    const owner = render('owner');
    for (const [, , label] of exports) assert.ok(owner.includes(label), label);
    assert.ok(owner.includes('Excel Shablonini Yuklab Olish'));
    for (const role of ['staff', 'platform_admin', null]) {
      const markup = render(role);
      for (const [, , label] of exports) assert.ok(!markup.includes(label), `${role}: ${label}`);
      assert.ok(!markup.includes('Excel Shablonini Yuklab Olish'), role);
      assert.ok(!markup.includes('yuklab oling'), role);
      assert.ok(markup.includes('Faylni tayyorlang')); // Staff can still prepare and upload imports.
    }
  } finally {
    await server.close();
  }
});
