import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import LZString from 'lz-string';
import { getLocalTemplates } from '@/utils/localDB';

export default function useUrlData(canvasEditor: any) {
  const route = useRoute();

  onMounted(async () => {
    if (!canvasEditor) return;

    // 如果網址列帶有 localId，則先載入本地模板
    if (route.query.localId) {
      try {
        const localTemplates = await getLocalTemplates();
        const localTmpl = localTemplates.find((t: any) => t.id === route.query.localId);
        if (localTmpl && localTmpl.json) {
          await new Promise<void>((resolve) => {
            canvasEditor.loadJSON(localTmpl.json, resolve);
          });
        }
      } catch (error) {
        console.error('載入本地模板失敗:', error);
      }
    }

    // 處理 data 參數
    if (route.query.data) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(route.query.data as string);
        if (!decompressed) {
          throw new Error('解壓縮失敗，可能資料已損毀或格式錯誤');
        }

        const parsedData = JSON.parse(decompressed);

        // 如果模板尚未載入完成 (因為可能有雲端或本地的非同步讀取)，
        // 我們監聽 'loadJson' 事件，確保畫布準備好再注入變數。
        // 但如果此時畫布已經載入完了 (例如使用者一打開時並沒有指定 tempId 或 localId)，
        // 就直接執行注入邏輯。
        const injectData = async () => {
          if (Array.isArray(parsedData)) {
            // 陣列模式：開啟批次產生視窗
            canvasEditor.emit('openBatchGenerate', parsedData);
          } else if (typeof parsedData === 'object') {
            // 單一模式：直接更新畫布元素
            const objs = canvasEditor.canvas.getObjects();
            for (const obj of objs) {
              if (obj.linkData && obj.linkData[1] && parsedData[obj.linkData[1]] !== undefined) {
                const val = parsedData[obj.linkData[1]];
                const propName = obj.linkData[0] || (obj.type.includes('text') ? 'text' : 'src');

                if (propName === 'repeat') {
                  // repeat 的處理需要深層克隆，這在預覽模式較複雜，單一模式下可先略過或補齊，
                  // 這裡先專注於 text 與 image 替換。
                  const repeatCount = parseInt(val, 10);
                  if (!isNaN(repeatCount)) {
                    if (repeatCount <= 0) {
                      canvasEditor.canvas.remove(obj);
                    } else if (repeatCount > 1) {
                      const gapValue = 10;
                      let currentLeft = obj.left + obj.getScaledWidth();
                      const keys = canvasEditor.getExtensionKey
                        ? canvasEditor.getExtensionKey()
                        : [];
                      for (let c = 1; c < repeatCount; c++) {
                        await new Promise<void>((resolveClone) => {
                          obj.clone((cloned: any) => {
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
                  }
                } else if (['i-text', 'textbox', 'text', 'vertical-textbox'].includes(obj.type)) {
                  obj.set(propName, val);
                } else if (obj.type === 'image') {
                  if (val && (val.startsWith('http') || val.startsWith('data:image'))) {
                    const pw = obj.width * obj.scaleX;
                    const ph = obj.height * obj.scaleY;

                    await new Promise<void>((resolve) => {
                      obj.setSrc(
                        val,
                        (img: any) => {
                          const s = Math.max(pw / img.width, ph / img.height);
                          img.set({
                            scaleX: s,
                            scaleY: s,
                            width: pw / s,
                            height: ph / s,
                            cropX: (img.width - pw / s) / 2,
                            cropY: (img.height - ph / s) / 2,
                          });

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

                            const rect = new window.fabric.Path(pathString, {
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
            canvasEditor.canvas.requestRenderAll();
          }
        };

        // 如果有指定 tempId，importTmpl 稍後才會發出 loadJson，所以我們監聽它
        // 因為 localId 上方是用 await 等待載入完成，如果是 localId 我們其實已經載入了
        // 為了安全起見，如果有 tempId 我們監聽 loadJson，否則可以直接執行。
        if (route.query.tempId) {
          canvasEditor.on('loadJson', () => {
            injectData();
          });
        } else {
          // 對於 localId 或沒有指定模板 (在當下畫布操作)，直接執行注入
          injectData();
        }
      } catch (error) {
        console.error('URL Data 解析或替換失敗:', error);
      }
    }
  });
}
