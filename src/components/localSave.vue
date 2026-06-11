<template>
  <div style="display: inline-block">
    <Button type="text" @click="saveLocal">儲存本機 / 覆寫</Button>
    <Divider type="vertical" />
    <Button type="text" @click="saveLocalNew">{{ $t('ui.saveAsNewLocal') }}</Button>

    <Modal v-model="showNameModal" :title="$t('ui.saveLocalTemplate')" @on-ok="confirmSaveLocal">
      <Input v-model="localTemplateName" :placeholder="$t('ui.plsInput')" autofocus />
    </Modal>
  </div>
</template>

<script setup>
import { Modal } from 'view-ui-plus';
import useSelect from '@/hooks/select';
import { useI18n } from 'vue-i18n';
import { Spin } from 'view-ui-plus';
import { useRoute, useRouter } from 'vue-router';
import { Message } from 'view-ui-plus';
import { ref } from 'vue';

const route = useRoute();
const router = useRouter();
const showNameModal = ref(false);
const localTemplateName = ref('');
const { t } = useI18n();
const { canvasEditor } = useSelect();

const saveLocal = async () => {
  try {
    const localId = route?.query?.localId;
    if (localId) {
      Spin.show();
      const json = canvasEditor.getJson();
      const thumbnail = canvasEditor.canvas.toDataURL({ format: 'jpeg', quality: 0.2 });
      const { getLocalTemplates, saveLocalTemplate } = await import('@/utils/localDB');
      const list = await getLocalTemplates();
      const existing = list.find((item) => item.id === localId);
      const name = existing ? existing.name : '本機設計_' + new Date().toLocaleString();

      await saveLocalTemplate({
        id: localId,
        name,
        json: JSON.stringify(json),
        thumbnail,
        updatedAt: Date.now(),
      });
      window.dispatchEvent(new CustomEvent('localTemplateSaved'));
      Message.success('成功覆寫本機模板：' + name);
      Spin.hide();
    } else {
      localTemplateName.value = '本機設計_' + new Date().toLocaleString();
      showNameModal.value = true;
    }
  } catch (error) {
    console.error(error);
    Message.error('儲存本機失敗');
    Spin.hide();
  }
};

const saveLocalNew = () => {
  localTemplateName.value = '本機設計_' + new Date().toLocaleString() + ' (複製)';
  showNameModal.value = true;
};

const confirmSaveLocal = async () => {
  try {
    if (!localTemplateName.value.trim()) {
      Message.warning('模板名稱不能為空');
      return;
    }
    Spin.show();
    const json = canvasEditor.getJson();
    const thumbnail = canvasEditor.canvas.toDataURL({ format: 'jpeg', quality: 0.2 });
    const { saveLocalTemplate } = await import('@/utils/localDB');

    const newId = Date.now().toString();
    await saveLocalTemplate({
      id: newId,
      name: localTemplateName.value.trim(),
      json: JSON.stringify(json),
      thumbnail,
      updatedAt: Date.now(),
    });

    window.dispatchEvent(new CustomEvent('localTemplateSaved'));
    router.replace('/?localId=' + newId);
    Message.success('成功建立本機模板！');
  } catch (error) {
    console.error(error);
    Message.error('儲存本機失敗');
  } finally {
    Spin.hide();
  }
};
</script>
