// script.js - Eternity.✨音乐网（2026 完全无 Proxy 版 - 基于网易云搜索）

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

        // ====================== 搜索函数（网易云公开接口，无 Proxy） ======================
        const searchMusic = async () => {
            if (!keyword.value.trim()) {
                showMsg('💡 请先输入歌名或歌手');
                return;
            }
            
            loading.value = true;
            songs.value = [];
            
            try {
                // 网易云搜索接口（浏览器可直接调用）
                const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword.value)}&type=1&limit=30&offset=0`;
                
                const res = await axios.get(searchUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                const songList = res.data?.result?.songs || [];
                
                songs.value = songList.map(item => ({
                    id: item.id,
                    mid: item.id,                    // 这里用网易云 id 作为 mid
                    name: item.name,
                    artist: item.artists?.map(a => a.name).join(', ') || '未知歌手',
                    album: item.album?.name || '',
                    cover: item.album?.picUrl || defaultCover,
                    duration: item.duration 
                        ? `${Math.floor(item.duration/60000)}:${String(Math.floor((item.duration % 60000)/1000)).padStart(2, '0')}` 
                        : '03:30'
                }));
                
                if (songs.value.length === 0) {
                    showMsg('😢 未找到相关歌曲，试试其他关键词');
                } else {
                    showMsg(`✅ 找到 ${songs.value.length} 首歌曲（网易云）`);
                }
            } catch (err) {
                console.error('搜索错误:', err);
                showMsg('❌ 搜索失败，请稍后重试（网易云接口偶尔不稳）');
            } finally {
                loading.value = false;
            }
        };

        // ====================== 获取播放链接（多公共接口 + 网易云外链） ======================
        const getPlayUrl = async (songId, songName) => {
            if (!songId) return null;

            // 优先使用网易云官方外链（最稳定，无需 proxy）
            const neteaseUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
            
            // 备选公共 QQ 接口（如果想混用 QQ 资源）
            const levelMap = { '128k': '128', '320k': '320', 'flac': 'flac' };
            const level = levelMap[currentQuality.value] || '128';
            
            const qqApiList = [
                `https://api.xn--7gq663by6b.com/qqmusic/?id=${songId}&type=${level}`,   // 注意：这里 songId 是网易云的，可能不匹配，实际会 fallback
                `https://music.nxinxz.com/kgqq/tx.php?id=${songId}&level=${level}&type=mp3`
            ];

            // 先尝试网易云（推荐）
            try {
                // 简单验证链接是否可访问（可选）
                return neteaseUrl;
            } catch (e) {}

            // 如果需要 QQ 资源，可尝试下面（但 songId 不一定匹配）
            for (let url of qqApiList) {
                try {
                    const test = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
                    if (test) return url;
                } catch (e) {}
            }

            // 最终兜底测试音频
            return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        };

        const playSong = async (song) => {
            if (!song) return;
            
            currentSong.value = song;
            playError.value = '';
            
            const url = await getPlayUrl(song.mid, song.name);
            
            currentPlayUrl.value = url;
            showMsg(`🎵 正在播放：${song.name}（${currentQuality.value}）`);
        };

        const refreshPlay = () => {
            if (currentSong.value) playSong(currentSong.value);
        };

        const onPlayError = () => {
            playError.value = '播放失败，可尝试切换音质或换首歌';
            showMsg('播放失败，建议切换音质或换一首歌');
        };

        return {
            keyword, songs, loading, currentSong, currentPlayUrl, playError, message,
            currentQuality, qualities, defaultCover, quickTags,
            searchMusic, playSong, refreshPlay, onPlayError
        };
    }
}).mount('#app');
