import materials from './materials.json';
import materialTypes from './material-types.json';
import templs from './templs.json';
import templTypes from './templ-types.json';
import fontStyles from './font-styles.json';
import fontStyleTypes from './font-style-types.json';
import banners from './banners.json';

const mockDb = {
  materials: materials,
  'material-types': materialTypes,
  templs: templs,
  'templ-types': templTypes,
  'font-styles': fontStyles,
  'font-style-types': fontStyleTypes,
  banners: banners,
};

export const getMockDataAll = (collectionName) => mockDb[collectionName] || [];

export const getMockData = (
  collectionName,
  filters = {},
  pagination = { page: 1, pageSize: 10 }
) => {
  let data = mockDb[collectionName] || [];

  if (filters.typeId) {
    data = data.filter((item) => item.typeId === String(filters.typeId));
  }
  if (filters.keyword) {
    data = data.filter((item) => item.name.includes(filters.keyword));
  }

  const total = data.length;
  const pageCount = Math.ceil(total / pagination.pageSize);
  const start = (pagination.page - 1) * pagination.pageSize;
  const pagedData = data.slice(start, start + pagination.pageSize);

  return {
    data: pagedData,
    meta: {
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        pageCount,
        total,
      },
    },
  };
};
