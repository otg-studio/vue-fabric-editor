<!--
 * @Description: 批次產圖元件
-->

<template>
  <Modal v-model="visible" title="批次產圖 (Batch Generate)" :width="800">
    <div style="margin-bottom: 15px">
      <p v-if="variables.length === 0" style="color: red">
        畫布中未偵測到變數！請選取畫布上的文字或圖片，在「資料 -> 變數名稱 (linkData
        第二格)」填入變數。
      </p>
      <p v-else>
        已偵測變數：
        <Tag color="blue" v-for="v in variables" :key="v">{{ v }}</Tag>
      </p>
    </div>

    <div v-if="variables.length > 0" class="data-rows">
      <div class="data-row" v-for="(row, index) in tableData" :key="index">
        <div class="row-header">
          <strong>圖片 {{ index + 1 }}</strong>
          <Button type="text" size="small" style="color: red" @click="removeRow(index)">
            刪除
          </Button>
        </div>
        <Row :gutter="10">
          <Col :span="colSpan" v-for="v in variables" :key="v">
            <Input v-model="row[v]" :placeholder="`請輸入 ${v}`" />
          </Col>
        </Row>
      </div>
      <Button type="dashed" long @click="addRow" style="margin-top: 10px">＋ 新增一筆資料</Button>
    </div>

    <template #footer>
      <Button @click="visible = false">取消</Button>
      <Button
        type="primary"
        :loading="isGenerating"
        @click="generateBatch"
        :disabled="tableData.length === 0 || variables.length === 0"
      >
        開始批次生成 ({{ tableData.length }} 張)
      </Button>
    </template>
  </Modal>
</template>

<script setup name="batchGenerate">
import { ref, computed } from 'vue';
import { Message, Spin } from 'view-ui-plus';
import useSelect from '@/hooks/select';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const { canvasEditor, fabric } = useSelect();

const visible = ref(false);
const variables = ref([]);
const tableData = ref([]);
const isGenerating = ref(false);

const colSpan = computed(() => {
  if (variables.value.length === 0) return 24;
  return Math.max(4, Math.floor(24 / variables.value.length));
});

const open = () => {
  // 找出畫布中所有設定了 linkData[1] (變數名稱) 的物件
  const objs = canvasEditor.canvas.getObjects().filter((item) => item.linkData && item.linkData[1]);
  const vars = new Set();
  objs.forEach((obj) => {
    vars.add(obj.linkData[1]);
  });
  variables.value = Array.from(vars);

  tableData.value = [];
  if (variables.value.length > 0) {
    addRow();
  }
  visible.value = true;
};

const addRow = () => {
  const newRow = {};
  variables.value.forEach((v) => {
    newRow[v] = '';
  });
  tableData.value.push(newRow);
};

const removeRow = (index) => {
  tableData.value.splice(index, 1);
};

const generateBatch = async () => {
  if (tableData.value.length === 0) return;
  isGenerating.value = true;
  Spin.show({ render: (h) => h('div', '批次產圖中，這可能需要一點時間...') });

  try {
    const zip = new JSZip();

    // 取得原始畫布 JSON 備份
    const originalJson = canvasEditor.getJson();

    // 為了安全起見，我們使用主畫布進行替換後拍照，因為有文字字型載入的問題
    for (let i = 0; i < tableData.value.length; i++) {
      const rowData = tableData.value[i];

      // 載入原始畫布狀態
      await new Promise((resolve) => {
        canvasEditor.loadJSON(JSON.stringify(originalJson), resolve);
      });

      // 替換變數
      const objs = [...canvasEditor.canvas.getObjects()];
      for (const obj of objs) {
        if (obj.linkData && obj.linkData[1] && rowData[obj.linkData[1]] !== undefined) {
          const val = rowData[obj.linkData[1]];
          const propName = obj.linkData[0] || (obj.type.includes('text') ? 'text' : 'src');

          if (propName === 'repeat') {
            const repeatCount = parseInt(val, 10);
            if (!isNaN(repeatCount) && repeatCount > 1) {
              const gapValue = 10;
              let currentLeft = obj.left + obj.getScaledWidth();
              const keys = canvasEditor.getExtensionKey ? canvasEditor.getExtensionKey() : [];

              for (let c = 1; c < repeatCount; c++) {
                await new Promise((resolveClone) => {
                  obj.clone((cloned) => {
                    cloned.set({
                      left: currentLeft + gapValue,
                      top: obj.top,
                    });
                    canvasEditor.canvas.add(cloned);
                    currentLeft = cloned.left + cloned.getScaledWidth();
                    resolveClone();
                  }, keys);
                });
              }
            }
          } else if (['i-text', 'textbox', 'text', 'vertical-textbox'].includes(obj.type)) {
            obj.set(propName, val);
          } else if (obj.type === 'image') {
            if (val && (val.startsWith('http') || val.startsWith('data:image'))) {
              // 記下原始的顯示尺寸
              const pw = obj.width * obj.scaleX;
              const ph = obj.height * obj.scaleY;

              await new Promise((resolve) => {
                obj.setSrc(
                  val,
                  (img) => {
                    // 算出 cover 的縮放比例
                    const s = Math.max(pw / img.width, ph / img.height);

                    // 裁切圖片，使其等比例填滿原佔位框
                    img.set({
                      scaleX: s,
                      scaleY: s,
                      width: pw / s,
                      height: ph / s,
                      cropX: (img.width - pw / s) / 2,
                      cropY: (img.height - ph / s) / 2,
                    });

                    // 若原圖片有設定圓角，必須重新計算 clipPath
                    if (img.roundValue && img.roundValue > 0) {
                      const scaleX = img.get('scaleX') || 1;
                      const scaleY = img.get('scaleY') || 1;

                      const w = img.width;
                      const h = img.height;
                      const rx = Math.max(0, Math.round(Number(img.roundValue) / scaleX));
                      const ry = Math.max(0, Math.round(Number(img.roundValue) / scaleY));

                      const x = -w / 2;
                      const y = -h / 2;
                      const r1 = Math.min(rx, w / 2);
                      const r2 = Math.min(ry, h / 2);

                      const pathString = `
                        M ${x + r1} ${y}
                        L ${x + w - r1} ${y}
                        A ${r1} ${r2} 0 0 1 ${x + w} ${y + r2}
                        L ${x + w} ${y + h - r2}
                        A ${r1} ${r2} 0 0 1 ${x + w - r1} ${y + h}
                        L ${x + r1} ${y + h}
                        A ${r1} ${r2} 0 0 1 ${x} ${y + h - r2}
                        L ${x} ${y + r2}
                        A ${r1} ${r2} 0 0 1 ${x + r1} ${y}
                        Z
                      `
                        .trim()
                        .replace(/\s+/g, ' ');

                      const rect = new fabric.Path(pathString, {
                        originX: 'center',
                        originY: 'center',
                        left: 0,
                        top: 0,
                        fill: '#000000',
                        absolutePositioned: false,
                      });
                      img.set('clipPath', rect);
                    }
                    resolve();
                  },
                  { crossOrigin: 'anonymous' }
                );
              });
            }
          }
        }
      }

      // 觸發重新渲染
      canvasEditor.canvas.requestRenderAll();

      // 取得畫布圖片的 base64
      const dataUrl = await canvasEditor.preview();
      const base64Data = dataUrl.replace(/^data:image\/(png|jpeg);base64,/, '');

      // 加入 ZIP
      zip.file(`batch_${i + 1}.png`, base64Data, { base64: true });
    }

    // 復原原本的畫布
    await new Promise((resolve) => {
      canvasEditor.loadJSON(JSON.stringify(originalJson), resolve);
    });

    // 打包與下載
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'batch_images.zip');
    Message.success('批次產圖成功！');
    visible.value = false;
  } catch (error) {
    console.error(error);
    Message.error('產圖失敗');
  } finally {
    isGenerating.value = false;
    Spin.hide();
  }
};

defineExpose({
  open,
});
</script>

<style scoped lang="less">
.data-rows {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 10px;
}
.data-row {
  border: 1px solid #e8eaec;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
  background-color: #f8f8f9;
}
.row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}
</style>
