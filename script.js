// script.js - Eternity.✨音乐网（2026 极简稳定版 - 无 Proxy）

const { createApp, ref } = Vue;

createApp({
    setup() {
        const keyword = ref('');
        const songs = ref([]);
        const loading = ref(false);
        const currentSong = ref(null);
        const currentPlayUrl = ref('');
        const playError = ref('');
        const message = ref('');
        const currentQuality = ref('128k');
        
        const defaultCover = 'https://y.gtimg.cn/music/photo_new/T002R300x300M000000MkMni19ClKG.jpg';
        
        const qualities = [
            { value: '128k', label: '标准' },
            { value: '320k', label: '高品质' },
            { value: 'flac', label: '无损' }
        ];
        
        const quickTags = ['晴天', '稻香', '夜曲', '七里香', '告白气球', '海阔天空', '起风了', '孤勇者'];

        const showMsg = (msg) => {
            message.value = msg;
            setTimeout(() => message.value = '', 3000);
        };

        // ====================== 搜索（极简网易云接口） ======================
        const searchMusic = async () => {
            if (!keyword.value.trim()) {
                showMsg('💡 请先输入歌名或歌手');
                return;
            }
            
            loading.value = true;
            songs.value = [];
            
            try {
                const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword.value)}&type=1&limit=30&offset=0&realIP=211.161.244.0`;
                
                const res = await axios.get(searchUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                const songList = res.data?.result?.songs || [];
                
                songs.value = songList.map(item => ({
                    id: item.id,
                    mid: item.id,
                    name: item.name,
                    artist: item.artists?.map(a => a.name).join(', ') || '未知歌手',
                    album: item.album?.name || '',
                    cover: item.album?.picUrl ? item.album.picUrl.replace('http:', 'https:') : defaultCover,
                    duration: item.duration 
                        ? `${Math.floor(item.duration/60000)}:${String(Math.floor((item.duration % 60000)/1000)).padStart(2, '0')}` 
                        : '03:30'
                }));
                
                if (songs.value.length === 0) {
                    showMsg('😢 未找到歌曲，试试其他关键词');
                } else {
                    showMsg(`✅ 找到 ${songs.value.length} 首歌曲`);
                }
            } catch (err) {
                console.error('搜索失败:', err);
                showMsg('❌ 搜索失败，请稍后重试或换关键词');
            } finally {
                loading.value = false;
            }
        };

        // ====================== 播放链接（优先你的念心 QQ 音源） ======================
        const getPlayUrl = async (songId) => {
            if (!songId) return null;

            const levelMap = {
                '128k': '128',
                '320k': '320',
                'flac': 'flac'
            };
            const level = levelMap[currentQuality.value] || '128';

            // 优先使用你的念心 QQ 音源
            const nxUrl = `https://music.nxinxz.com/kgqq/tx.php?id=${songId}&level=${level}&type=mp3`;
            
            // 备用网易云外链
            const neteaseUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;

            console.log(`尝试念心音源: ${nxUrl}`);
            return nxUrl;   // 先强制用念心，后面可根据测试调整
        };

        const playSong = async (song) => {
            if (!song) return;
            
            currentSong.value = song;
            playError.value = '';
            
            const url = await getPlayUrl(song.mid);
            currentPlayUrl.value = url;
            
            showMsg(`🎵 正在播放：${song.name}（${currentQuality.value}）`);
        };

        const refreshPlay = () => {
            if (currentSong.value) playSong(currentSong.value);
        };

        const onPlayError = () => {
            playError.value = '播放失败，可尝试切换音质';
            showMsg('播放失败，建议切换音质或换一首歌');
        };

        return {
            keyword, songs, loading, currentSong, currentPlayUrl, playError, message,
            currentQuality, qualities, defaultCover, quickTags,
            searchMusic, playSong, refreshPlay, onPlayError
        };
    }
}).mount('#app');
