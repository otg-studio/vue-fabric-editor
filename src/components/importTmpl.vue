<!--
 * @Author: 秦少卫
 * @Date: 2022-09-03 19:16:55
 * @LastEditors: 秦少卫
 * @LastEditTime: 2025-03-18 19:01:39
 * @Description: 导入模板
-->

<template>
  <div>
    <div style="margin-bottom: 15px; margin-top: 10px">
      <Divider plain>本機儲存模板</Divider>
    </div>

    <!-- 搜索组件 -->
    <div class="search-box" v-if="storageMode === 'cloud'">
      <Select
        class="select"
        v-model="typeValue"
        @on-change="changeSelectType"
        :disabled="pageLoading"
      >
        <Option v-for="item in typeList" :value="item.value" :key="item.value">
          {{ item.label }}
        </Option>
      </Select>
      <Input
        class="input"
        :placeholder="`在${typeText}中搜索`"
        v-model="searchKeyWord"
        search
        :disabled="pageLoading"
        @on-search="startGetList"
      />
    </div>
    <!-- 列表 -->
    <div style="height: calc(100vh - 150px)" id="myTemplBox">
      <Scroll
        key="mysscroll"
        v-if="storageMode === 'cloud' && showScroll"
        :on-reach-bottom="nextPage"
        :height="scrollHeight"
        :distance-to-edge="[-1, -1]"
      >
        <!-- 列表 -->
        <div class="list-box">
          <Tooltip :content="info.name" v-for="info in pageData" :key="info.src" placement="top">
            <div class="tmpl-img-box" style="position: relative">
              <Image
                lazy
                :src="info.previewSrc"
                fit="contain"
                height="100%"
                :alt="info.name"
                @click="beforeClearTip(info)"
              />
              <div
                style="
                  position: absolute;
                  top: 0;
                  right: 0;
                  background: rgba(0, 0, 0, 0.5);
                  border-radius: 0 5px 0 5px;
                  z-index: 10;
                  display: none;
                "
                class="hover-show-btn"
              >
                <Button
                  type="text"
                  size="small"
                  icon="md-copy"
                  @click.stop="copyId(info.id)"
                  style="color: white; padding: 0 4px"
                ></Button>
              </div>
            </div>
          </Tooltip>
        </div>
        <Spin size="large" fix :show="pageLoading"></Spin>

        <Divider plain v-if="isDownBottm">{{ $t('ui.bottomed') }}</Divider>
      </Scroll>

      <!-- 本機模板 -->
      <div
        v-if="storageMode === 'local'"
        style="overflow-y: auto; height: 100%; padding-bottom: 20px"
      >
        <div style="display: flex; justify-content: flex-end; margin-bottom: 10px; gap: 8px">
          <Button
            v-if="localTemplates.length > 0"
            size="small"
            type="default"
            @click="toggleSelectAll"
          >
            {{ selectedLocalIds.length === localTemplates.length ? '取消全選' : '全選' }}
          </Button>
          <Button size="small" type="primary" @click="exportLocalTemplates">
            {{ selectedLocalIds.length > 0 ? `匯出選取 (${selectedLocalIds.length})` : '匯出全部' }}
          </Button>
          <Button
            v-if="selectedLocalIds.length > 0"
            size="small"
            type="error"
            @click="deleteSelectedLocalTemplates"
          >
            刪除選取 ({{ selectedLocalIds.length }})
          </Button>
          <Button size="small" type="success" @click="triggerImport">匯入</Button>
          <input
            type="file"
            ref="importInputRef"
            style="display: none"
            accept=".json"
            @change="handleImportLocal"
          />
        </div>
        <CheckboxGroup v-model="selectedLocalIds">
          <div class="list-box" @contextmenu.capture="closeAllContextMenus">
            <Dropdown
              v-for="info in localTemplates"
              :key="info.id"
              trigger="contextMenu"
              @on-click="(name) => handleLocalContextClick(name, info)"
            >
              <Tooltip :content="info.name" placement="top">
                <div class="tmpl-img-box" style="position: relative; margin-bottom: 10px">
                  <Checkbox
                    :label="info.id"
                    style="position: absolute; top: 5px; left: 5px; z-index: 10"
                  >
                    <span style="display: none"></span>
                  </Checkbox>
                  <Image
                    lazy
                    :src="info.thumbnail"
                    fit="contain"
                    height="100%"
                    :alt="info.name"
                    @click="beforeClearLocalTip(info)"
                  />
                </div>
              </Tooltip>
              <template #list>
                <DropdownMenu>
                  <DropdownItem name="copy">複製 ID</DropdownItem>
                  <DropdownItem name="changeId">修改 ID</DropdownItem>
                  <DropdownItem name="rename">重新命名</DropdownItem>
                  <DropdownItem name="exportSingle" divided>匯出變數範例 (單筆)</DropdownItem>
                  <DropdownItem name="exportMulti">匯出變數範例 (多筆)</DropdownItem>
                  <DropdownItem name="delete" style="color: #ed4014" divided>刪除</DropdownItem>
                </DropdownMenu>
              </template>
            </Dropdown>
          </div>
        </CheckboxGroup>
        <div
          v-if="localTemplates.length === 0"
          style="text-align: center; width: 100%; margin-top: 50px; color: #999"
        >
          尚無本機儲存模板
        </div>
      </div>
    </div>

    <Modal v-model="showRenameModal" :title="$t('ui.renameTemplate')" @on-ok="confirmRenameLocal">
      <Input v-model="renameTargetName" :placeholder="$t('ui.plsInput')" autofocus />
    </Modal>

    <Modal v-model="showChangeIdModal" title="修改模板 ID" @on-ok="confirmChangeId">
      <Input v-model="newTargetId" placeholder="請輸入新的 ID" autofocus />
    </Modal>
  </div>
</template>

<script setup name="ImportTmpl">
import useSelect from '@/hooks/select';
import usePageList from '@/hooks/pageList';
import { Spin, Modal } from 'view-ui-plus';
import { debounce } from 'lodash-es';
import { onMounted, onBeforeUnmount, ref } from 'vue';

import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const { canvasEditor } = useSelect();

const {
  typeValue,
  typeText,
  typeList,
  pageLoading,
  pageData,
  searchKeyWord,
  isDownBottm,
  startGetList,
  nextPage,
  showScroll,
  scrollHeight,
  getInfo,
} = usePageList({
  typeUrl: 'templ-types',
  listUrl: 'templs',
  searchTypeKey: 'templ_type',
  searchWordKey: 'name',
  pageSize: 10,
  scrollElement: '#myTemplBox',
  fields: ['name'],
});

typeValue.value = 20;

// 替换提示
const beforeClearTip = (info) => {
  Modal.confirm({
    title: t('tip'),
    content: `<p>${t('replaceTip')}</p>`,
    okText: t('ok'),
    cancelText: t('cancel'),
    onOk: () => getTempData(info),
  });
};

onMounted(() => {
  // 移除官方範本的載入，改為載入本機範本
  loadLocal();
  getTemplInfo();
  window.addEventListener('localTemplateSaved', loadLocal);
});

onBeforeUnmount(() => {
  window.removeEventListener('localTemplateSaved', loadLocal);
});

// 获取模板数据
const getTempData = async (info) => {
  Spin.show({
    render: (h) => h('div', t('alert.loading_data')),
  });
  const infoRes = await getInfo(info.id);
  if (route.query.admin) {
    router.replace('/?tempId=' + info.id + '&admin=true');
  } else {
    router.replace('/?tempId=' + info.id);
  }
  canvasEditor.loadJSON(JSON.stringify(infoRes.data.data.attributes.json), Spin.hide);
};

const getTemplInfo = async () => {
  if (route.query.tempId) {
    try {
      const infoRes = await getInfo(route.query.tempId);
      canvasEditor.loadJSON(JSON.stringify(infoRes.data.data.attributes.json), Spin.hide);
    } catch (error) {
      console.log(error);
    }
  }
};

const storageMode = ref('local');
const localTemplates = ref([]);

const showRenameModal = ref(false);
const renameTargetId = ref('');
const renameTargetName = ref('');

const showChangeIdModal = ref(false);
const changeIdTargetId = ref('');
const newTargetId = ref('');

const loadLocal = async () => {
  const { getLocalTemplates } = await import('@/utils/localDB');
  localTemplates.value = await getLocalTemplates();
};

const beforeClearLocalTip = (info) => {
  Modal.confirm({
    title: t('tip'),
    content: `<p>${t('replaceTip')}</p>`,
    okText: t('ok'),
    cancelText: t('cancel'),
    onOk: () => {
      Spin.show({ render: (h) => h('div', t('alert.loading_data')) });
      router.replace('/?localId=' + info.id);
      canvasEditor.loadJSON(info.json, Spin.hide);
    },
  });
};

const renameLocal = (info) => {
  renameTargetId.value = info.id;
  renameTargetName.value = info.name;
  showRenameModal.value = true;
};

const copyId = (id) => {
  navigator.clipboard.writeText(id).then(() => {
    Message.success(`已複製模板 ID: ${id}`);
  });
};

import { Message } from 'view-ui-plus';

const confirmRenameLocal = async () => {
  if (!renameTargetName.value.trim()) {
    Message.warning('名稱不能為空');
    return;
  }
  const { getLocalTemplates, saveLocalTemplate } = await import('@/utils/localDB');
  const list = await getLocalTemplates();
  const existing = list.find((item) => item.id === renameTargetId.value);
  if (existing) {
    existing.name = renameTargetName.value.trim();
    existing.updatedAt = Date.now();
    await saveLocalTemplate(existing);
    loadLocal();
    Message.success('重新命名成功');
  }
};

const changeIdLocal = (info) => {
  changeIdTargetId.value = info.id;
  newTargetId.value = info.id;
  showChangeIdModal.value = true;
};

const confirmChangeId = async () => {
  if (!newTargetId.value.trim()) {
    Message.warning('ID 不能為空');
    return;
  }
  if (newTargetId.value.trim() === changeIdTargetId.value) {
    return;
  }
  const { getLocalTemplates, saveLocalTemplate, deleteLocalTemplate } = await import(
    '@/utils/localDB'
  );
  const list = await getLocalTemplates();

  if (list.some((item) => item.id === newTargetId.value.trim())) {
    Message.error('此 ID 已經存在');
    return;
  }

  const existing = list.find((item) => item.id === changeIdTargetId.value);
  if (existing) {
    const newItem = { ...existing, id: newTargetId.value.trim(), updatedAt: Date.now() };
    await saveLocalTemplate(newItem);
    await deleteLocalTemplate(changeIdTargetId.value);

    if (route.query.localId === changeIdTargetId.value) {
      router.replace('/?localId=' + newTargetId.value.trim());
    }

    await loadLocal();
    Message.success('修改 ID 成功');
  }
};

const deleteLocal = async (id) => {
  Modal.confirm({
    title: '刪除提示',
    content: '<p>確定要刪除此本機模板嗎？</p>',
    onOk: async () => {
      const { deleteLocalTemplate } = await import('@/utils/localDB');
      await deleteLocalTemplate(id);
      selectedLocalIds.value = selectedLocalIds.value.filter((itemId) => itemId !== id);
      loadLocal();
    },
  });
};

const extractVariables = (info) => {
  const vars = new Set();
  try {
    const data = typeof info.json === 'string' ? JSON.parse(info.json) : info.json;
    if (data.objects) {
      data.objects.forEach((obj) => {
        if (obj.linkData && obj.linkData[1]) {
          vars.add(obj.linkData[1]);
        }
      });
    }
  } catch (e) {
    console.error(e);
  }
  return Array.from(vars);
};

const generateMockData = (vars, type) => {
  const row = {};
  vars.forEach((v) => {
    row[v] = `test_${v}_1`;
  });
  if (type === 'single') {
    return row;
  } else {
    const row2 = {};
    vars.forEach((v) => {
      row2[v] = `test_${v}_2`;
    });
    return [row, row2];
  }
};

const handleExportJson = (info, type) => {
  const vars = extractVariables(info);
  if (vars.length === 0) {
    Message.warning('此模板沒有設定任何變數 (linkData)');
    return;
  }
  const data = generateMockData(vars, type);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  saveAs(blob, `${info.name}_${type}_mock.json`);
};

const handleLocalContextClick = (name, info) => {
  if (name === 'copy') {
    copyId(info.id);
  } else if (name === 'changeId') {
    changeIdLocal(info);
  } else if (name === 'rename') {
    renameLocal(info);
  } else if (name === 'exportSingle') {
    handleExportJson(info, 'single');
  } else if (name === 'exportMulti') {
    handleExportJson(info, 'multi');
  } else if (name === 'delete') {
    deleteLocal(info.id);
  }
};

const closeAllContextMenus = () => {
  // 模擬點擊 document 來觸發所有 Dropdown 的 clickoutside，藉此自動關閉上一個選單
  document.dispatchEvent(new Event('click'));
};

import { saveAs } from 'file-saver';

const importInputRef = ref(null);
const selectedLocalIds = ref([]);

const toggleSelectAll = () => {
  if (selectedLocalIds.value.length === localTemplates.value.length) {
    selectedLocalIds.value = [];
  } else {
    selectedLocalIds.value = localTemplates.value.map((item) => item.id);
  }
};

const deleteSelectedLocalTemplates = async () => {
  if (selectedLocalIds.value.length === 0) return;
  Modal.confirm({
    title: '刪除提示',
    content: `<p>確定要刪除選取的 ${selectedLocalIds.value.length} 個本機模板嗎？</p>`,
    onOk: async () => {
      const { deleteLocalTemplate } = await import('@/utils/localDB');
      for (const id of selectedLocalIds.value) {
        await deleteLocalTemplate(id);
      }
      selectedLocalIds.value = [];
      loadLocal();
      Message.success('批次刪除成功');
    },
  });
};

const exportLocalTemplates = async () => {
  const { getLocalTemplates } = await import('@/utils/localDB');
  const list = await getLocalTemplates();
  if (!list || list.length === 0) {
    Message.warning('目前沒有本機模板可以匯出');
    return;
  }

  let exportList = list;
  if (selectedLocalIds.value.length > 0) {
    exportList = list.filter((item) => selectedLocalIds.value.includes(item.id));
  }

  const blob = new Blob([JSON.stringify(exportList, null, 2)], { type: 'application/json' });
  saveAs(blob, `local_templates_${new Date().toISOString().split('T')[0]}.json`);
};

const triggerImport = () => {
  if (importInputRef.value) {
    importInputRef.value.click();
  }
};

const handleImportLocal = async (event) => {
  const target = event.target;
  const file = target.files && target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target && e.target.result);
      if (!Array.isArray(data)) {
        Message.error('檔案格式錯誤：必須為陣列');
        return;
      }
      const { saveLocalTemplate } = await import('@/utils/localDB');
      let successCount = 0;
      for (const item of data) {
        if (item.id && item.json && item.thumbnail && item.name) {
          await saveLocalTemplate(item);
          successCount++;
        }
      }
      Message.success(`成功匯入 ${successCount} 個模板`);
      loadLocal();
    } catch (err) {
      console.error(err);
      Message.error('解析 JSON 檔案失敗');
    } finally {
      if (importInputRef.value) {
        importInputRef.value.value = '';
      }
    }
  };
  reader.readAsText(file);
};

const changeSelectType = debounce(() => {
  startGetList();
}, 100);
</script>

<style scoped lang="less">
.tmpl-img-box:hover .hover-show-btn {
  display: block !important;
}
.search-box {
  padding-top: 10px;
  padding-bottom: 10px;
  display: flex;
  .input {
    margin-left: 10px;
  }
  .select {
    width: 100px;
  }
}

.list-box {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.tmpl-img-box {
  width: 100%;
  cursor: pointer;
  border-radius: 5px;
  overflow: hidden;
  background-color: #f6f7f9;
  border: 1px solid #eef2f8;
  &:hover {
    :deep(.ivu-image-img) {
      opacity: 0.8;
    }
  }
}
</style>
