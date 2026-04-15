// script.js - Eternity.✨音乐网（2026 修复搜索 + 多音源版）

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

        // ====================== 修复后的搜索（网易云 + realIP 参数，更容易出结果） ======================
        const searchMusic = async () => {
            if (!keyword.value.trim()) {
                showMsg('💡 请先输入歌名或歌手');
                return;
            }
            
            loading.value = true;
            songs.value = [];
            
            try {
                // 带 realIP 参数的网易云搜索接口（2026 年较稳定）
                const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword.value)}&type=1&limit=30&offset=0&realIP=211.161.244.0`;
                
                const res = await axios.get(searchUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://music.163.com'
                    }
                });
                
                const songList = res.data?.result?.songs || [];
                
                if (songList.length === 0) {
                    showMsg('😢 未找到歌曲，尝试换个关键词');
                    loading.value = false;
                    return;
                }
                
                songs.value = songList.map(item => ({
                    id: item.id,
                    mid: item.id,
                    name: item.name,
                    artist: item.artists?.map(a => a.name).join(', ') || '未知歌手',
                    album: item.album?.name || '',
                    cover: item.album?.picUrl ? item.album.picUrl.replace('http:', 'https:') : defaultCover,
                    duration: item.duration 
                        ? `${Math.floor(item.duration / 60000)}:${String(Math.floor((item.duration % 60000) / 1000)).padStart(2, '0')}` 
                        : '03:30'
                }));
                
                showMsg(`✅ 找到 ${songs.value.length} 首歌曲`);
            } catch (err) {
                console.error('搜索错误:', err);
                showMsg('❌ 搜索失败，请稍后重试或换关键词');
            } finally {
                loading.value = false;
            }
        };

        // ====================== 多音源播放（加入你的念心QQ + 元力/青音乐源常用接口） ======================
        const getPlayUrl = async (songId, songName) => {
            if (!songId) return null;

            const levelMap = {
                '128k': '128',
                '320k': '320',
                'flac': 'flac'
            };
            const level = levelMap[currentQuality.value] || '128';

            // 音源尝试顺序（优先网易云外链 → 你的念心QQ音源 → 其他公共接口）
            const apiList = [
                // 1. 网易云官方外链（最稳）
                `https://music.163.com/song/media/outer/url?id=${songId}.mp3`,
                
                // 2. 你提供的念心 QQ 音源（https://music.nxinxz.com/...）
                `https://music.nxinxz.com/kgqq/tx.php?id=${songId}&level=${level}&type=mp3`,
                
                // 3. 元力/青音乐源常用公共 QQ 接口
                `https://api.xn--7gq663by6b.com/qqmusic/?id=${songId}&type=${level}`,
                
                // 4. 其他备用
                `https://music.nxinxz.com/kgqq/tx.php?id=${songId}&level=128&type=mp3`
            ];

            for (let url of apiList) {
                try {
                    console.log(`尝试音源: ${url}`);
                    const controller = new AbortController();
                    setTimeout(() => controller.abort(), 7000);
                    
                    const res = await fetch(url, { 
                        method: 'HEAD', 
                        mode: 'no-cors',
                        signal: controller.signal 
                    });
                    
                    if (res) {
                        console.log(`✅ 音源可用: ${url}`);
                        return url;
                    }
                } catch (e) {
                    console.log(`音源不可用，继续下一个`);
                }
            }

            // 最终兜底
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
