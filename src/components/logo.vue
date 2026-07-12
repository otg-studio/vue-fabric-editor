<!--
 * @Author: 秦少卫
 * @Date: 2024-06-11 09:12:24
 * @LastEditors: 秦少卫
 * @LastEditTime: 2024-06-12 09:02:50
 * @Description: logo
-->

<template>
  <div class="logo">
    <div class="title-container">
      <span>Vue Fabric Editor</span>
      <span class="version">{{ version }}</span>
    </div>
  </div>
</template>

<script setup name="Logo">
import { ref } from 'vue';
import pkg from '../../package.json';

// Use build-time injected version, fallback to package.json version
const version = ref(import.meta.env.VITE_APP_VERSION || `v${pkg.version}`);
</script>

<style scoped lang="less">
.logo {
  width: auto;
  height: 44px;
  display: inline-flex;
  margin-right: 10px;
  margin-left: 2px;
  align-items: center;

  .title-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  span {
    font-size: 18px;
    font-weight: bold;
    margin-left: 6px;
    line-height: 1;
  }

  .version {
    font-size: 11px;
    font-weight: normal;
    color: #666;
    margin-top: 4px;
  }
}
</style>
