/*
 * @Author: 秦少卫
 * @Date: 2024-04-24 14:07:06
 * @LastEditors: 秦少卫
 * @LastEditTime: 2024-06-14 16:17:41
 * @Description: 用户接口登录
 */

import axios from 'axios';
const baseURL = import.meta.env.APP_APIHOST;

const instance = axios.create({ baseURL });

instance.interceptors.request.use(function (config) {
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

const tokenKey = 'token';
function getToken() {
  const token = localStorage.getItem(tokenKey);
  return token;
}

// 详情
export const getUserInfo = (data: any) => instance.get('/api/users/me', data);

// 登录
export const login = (data: any) => instance.post('/api/auth/local', data);

// 注册
export const register = (data: any) => instance.post('/api/auth/local/register', data);

// 登出
export const logout = () => localStorage.setItem(tokenKey, '');

// 自动登录
export const autoLogin = (data: any) => instance.post('/api/custom/autoAuthUser', data);

// 设置token
export const setToken = (token: string) => localStorage.setItem(tokenKey, token);

// 获取个人素材列表
export const getFileList = (data: any) => instance.get('/api/user-materials?populate=*', data);

// 创建素材
export const createdMaterial = (data: any) => instance.post('/api/user-materials', data);

// 删除素材
export const removeMaterial = (id: any) => instance.delete('/api/user-materials/' + id);

// -----------------------------------------
// 本機儲存 (Local Storage) 模板功能
// -----------------------------------------
const LOCAL_TEMPL_KEY = 'local_user_templs';

const getLocalTempls = () => {
  const data = localStorage.getItem(LOCAL_TEMPL_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalTempls = (data: any[]) => {
  localStorage.setItem(LOCAL_TEMPL_KEY, JSON.stringify(data));
};

const generateId = () => Math.random().toString(36).substring(2, 15);

// 上传素材 (模擬回傳 Base64)
export const uploadImg = async (data: any) => {
  // 原本的 API:
  // return instance.post('/api/upload', data);
  const file = data.get('files');
  if (file) {
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    // 將 ID 直接設為 base64 內容，這樣 useMaterial 的 getCanvasCommonData 就能存入 base64
    return { data: [{ id: base64, url: base64 }] };
  }
  return { data: [{ id: '', url: '' }] };
};

// 创建模板
export const createdTempl = async (param: any) => {
  // return instance.post('/api/user-templs', param);
  const templs = getLocalTempls();
  const newTmpl = {
    id: generateId(),
    ...param.data,
    createdAt: new Date().toISOString(),
  };
  templs.unshift(newTmpl); // 加在最前面
  setLocalTempls(templs);
  return { data: { data: newTmpl } };
};

// 删除素材
export const removeTempl = async (id: any) => {
  // return instance.delete(`/api/user-templs/${id}`);
  let templs = getLocalTempls();
  templs = templs.filter((t: any) => t.id !== id);
  setLocalTempls(templs);
  return { data: { data: { id } } };
};

// 更新素材
export const updataTempl = async (id: any, param: any) => {
  // return instance.put(`/api/user-templs/${id}`, param);
  const templs = getLocalTempls();
  const index = templs.findIndex((t: any) => t.id === id);
  if (index !== -1) {
    templs[index] = { ...templs[index], ...param.data, updatedAt: new Date().toISOString() };
    setLocalTempls(templs);
    return { data: { data: templs[index] } };
  }
  return Promise.reject(new Error('Not found'));
};

// 查询素材列表
export const getTmplList = async (qsStr: any) => {
  // return instance.get(`/api/user-templs?${qsStr}`);
  let templs = getLocalTempls();

  if (typeof qsStr === 'string' && qsStr.includes('filters[parentId][$eq]=')) {
    const match = qsStr.match(/filters\[parentId\]\[\$eq\]=([^&]*)/);
    if (match) {
      const pid = match[1];
      templs = templs.filter((t: any) => String(t.parentId || '') === String(pid));
    }
  }

  // 模擬 Strapi 回傳格式
  const formattedData = templs.map((t: any) => ({
    id: t.id,
    attributes: {
      ...t,
      // 將 base64 字串包裝成 Strapi 圖片格式
      img: { data: { attributes: { url: t.img } } },
    },
  }));

  return {
    data: {
      data: formattedData,
      meta: { pagination: { total: formattedData.length } },
    },
  };
};

// 查询素材详情
export const getTmplInfo = async (id: any) => {
  // return instance.get(`/api/user-templs/${id}`);
  const templs = getLocalTempls();
  const found = templs.find((t: any) => t.id === id);
  if (found) {
    return { data: { data: { id: found.id, attributes: found } } };
  }
  return Promise.reject(new Error('Not found'));
};

// 获取用户树菜单
export const getUserFileTypeTree = () => instance.get(`/api/user-templ/getUerFileTypeTree`);

// 获取菜单树
export const getFileTypeTree = (data: any) =>
  instance.get(`/api/custom/getUerFileTypeTree`, {
    params: data,
  });

// 获取用户树菜单
export const getUerFileTree = () => instance.get(`/api/user-templ/getUerFileTree`);
