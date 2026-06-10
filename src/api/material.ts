/*
 * @Author: 秦少卫
 * @Date: 2024-04-24 14:07:06
 * @LastEditors: 秦少卫
 * @LastEditTime: 2024-10-07 17:06:16
 * @Description: 用户接口登录
 */

import { getMockDataAll } from '@/assets/mockData';
import ApiClass from './apiClass';

// web详情
export const getWebInfo = () => Promise.resolve({ data: { data: {} } });

// 获取素材分类
export const getMaterialTypes = () =>
  Promise.resolve({ data: { data: getMockDataAll('material-types') } });

// 获取素材列表
export const getMaterials = (data: any) => {
  const keyword = data?.filters?.name?.$contains;
  const all = getMockDataAll('materials');
  if (keyword) {
    return Promise.resolve({
      data: { data: all.filter((item: any) => item.name.includes(keyword)) },
    });
  }
  return Promise.resolve({ data: { data: all } });
};

// 获取根据分类获取素材
export const getMaterialsByType = (data: any) => {
  const typeId = data?.filters?.material_type?.$eq;
  const all = getMockDataAll('materials');
  if (typeId) {
    return Promise.resolve({
      data: { data: all.filter((item: any) => String(item.typeId) === String(typeId)) },
    });
  }
  return Promise.resolve({ data: { data: all } });
};

// 获取字体分类分类
export const getFontStyleTypes = () =>
  Promise.resolve({ data: { data: getMockDataAll('font-style-types') } });

// 获取字体素材列表
export const getFontStyles = (data: any) =>
  Promise.resolve({ data: { data: getMockDataAll('font-styles') } });

// 获取根据分类获取字体样式列表
export const getFontStyleListByType = (data: any) =>
  Promise.resolve({ data: { data: getMockDataAll('font-styles') } });

// 获取模板分类
export const getTmplTypes = () =>
  Promise.resolve({ data: { data: getMockDataAll('templ-types') } });

// 获取模板列表
export const getTmplList = (data: any) =>
  Promise.resolve({ data: { data: getMockDataAll('templs') } });

// 新版 API---------------------
// 获取模板列表
export const templsApi = new ApiClass('/api/templs');
// 获取模板动态参数
export const customDynamicsApi = new ApiClass('/api/custom/dynamics');
// 获取模板渲染后的数据
export const customRenderApi = new ApiClass('/api/custom/render');
// 素材接口
export const commonMaterialsApi = new ApiClass('/api/materials');
// 素材分类
export const commonMaterialsTypeApi = new ApiClass('/api/material-types');
// 获取模板类型
export const commonTmplTypeApi = new ApiClass('/api/templ-types');
// 获取模板列表
export const commonTmplApi = new ApiClass('/api/templs');
// 获取组合元素分类
export const commonFontGroupTypeApi = new ApiClass('/api/font-style-types');
// 获取组合元素
export const commonFontGroupApi = new ApiClass('/api/font-styles');
// 获取字体列表
export const commonFontApi = new ApiClass('/api/fonts');
// 获取边框列表
export const commonFontStyleApi = new ApiClass('/api/fontborders');
// 获取画布大小
export const commonSizeApi = new ApiClass('/api/sizes');
// banner接口
export const commonBannerApi = new ApiClass('/api/banners');
