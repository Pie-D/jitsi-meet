import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { makeStyles } from "tss-react/mui";
import {isLocalParticipantModerator, isLocalRoomOwner} from '../../base/participants/functions';
import { IReduxState } from "../../app/types";
import Avatar from "../../base/avatar/components/Avatar";
import { MEDIA_TYPE } from "../../base/media/constants";
import { getRemoteParticipants } from "../../base/participants/functions";
import { getTrackByMediaTypeAndParticipant } from "../../base/tracks/functions.any";
import { setImmersiveAssignments, swapImmersiveSlots } from "../actions";
import { DEFAULT_IMMERSIVE_SLOT_COUNT } from "../constants";
import "../reducer";
import { IMMERSIVE_TEMPLATES, getTemplateSlots } from "../templates";
import { getParticipantsPaneOpen, getParticipantsPaneWidth } from "../../participants-pane/functions";
import { CHAT_SIZE } from "../../chat/constants";
import { isMobileBrowser } from "../../base/environment/utils";

const useStyles = makeStyles()(() => ({
    root: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1, // Thấp hơn toolbar (250)
        pointerEvents: "none", // Cho phép click through
    },
    background: {
        position: "absolute",
        inset: 0,
        backgroundSize: "cover",
        backgroundPosition: "top !important",
        zIndex: 1,
    },
    slot: {
        position: "absolute",
        boxSizing: "border-box",
        background: "rgba(0,0,0,0.05)",
        padding: "0",
        margin: "0",
        zIndex: 2,
        pointerEvents: "auto", // Cho phép click trên slot
    },
    slotDisabled: {
        cursor: "not-allowed", // Hiển thị cursor không được phép
        // opacity: 0.7, // Làm mờ slot
    },
    slotHighlight: {
        border: "2px solid #4da3ff",
    },
    slotNormal: {
        border: "1px dashed rgba(255,255,255,0.35)",
    },
    slotContent: {
        width: "100%",
        height: "100%",
    },
    avatarWrapper: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    videoWrapper: {
        width: "100%",
        height: "100%",
        position: "relative",
        borderRadius: "1.2rem",
        overflow: "hidden",
        background: "linear-gradient(135deg, rgba(65, 182, 251, 0.1) 0%, rgba(65, 182, 251, 0.05) 100%)",
        boxShadow: "inset 0 0 30px rgba(65, 182, 251, 0.15)",
        margin: "-1px", // Loại bỏ khoảng trống nhỏ
        transform: "scale(1.005)", // Phóng to nhẹ để lấp đầy hoàn toàn
    },
    videoOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, rgba(65, 182, 251, 0.1) 0%, transparent 50%, rgba(65, 182, 251, 0.05) 100%)",
        pointerEvents: "none",
        zIndex: 1,
    },
    videoLocal: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: "1.2rem",
        border: "0px solid rgba(65, 182, 251, 0.3)",
        boxShadow: "inset 0 0 20px rgba(65, 182, 251, 0.1)",
        transition: "all 0.3s ease-in-out",
        overflow: "hidden",
        transform: "scaleX(-1)", // Phản chiếu ngang cho camera local
    },
    videoRemote: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: "1.2rem",
        border: "0px solid rgba(65, 182, 251, 0.3)",
        boxShadow: "inset 0 0 20px rgba(65, 182, 251, 0.1)",
        transition: "all 0.3s ease-in-out",
        overflow: "hidden",
        transform: "none", // Không phản chiếu cho camera remote
    },
}));

export default function ImmersiveView() {
    const dispatch = useDispatch();
    const immersive = useSelector((state: IReduxState) => state["features/immersive-view"]);
    // const isOwner = useSelector((state: IReduxState) => {
    //     const features: any = state["features/base/participants"].local?.features as any;
    //     const raw = features?.owner ?? features?.isOwner;
    //     return typeof raw === 'string' ? raw.toLowerCase() === 'true' : Boolean(raw);
    // });
    const isOwner = useSelector(isLocalRoomOwner);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const rootRef = React.useRef<HTMLDivElement>(null);
    
    // Lấy state từ Redux thay vì query DOM
    const isChatOpen = useSelector((state: IReduxState) => state['features/chat']?.isOpen ?? false);
    const chatWidth = useSelector((state: IReduxState) => state['features/chat']?.width?.current ?? CHAT_SIZE);
    const isParticipantsPaneOpen = useSelector(getParticipantsPaneOpen);
    const participantsPaneWidth = useSelector((state: IReduxState) => getParticipantsPaneWidth(state));
    
    // Tính toán initial state với Toolbox height ngay từ đầu
    const getInitialViewportInfo = useCallback(() => {
        const toolbox = document.getElementById('new-toolbox');
        const toolboxHeight = toolbox?.clientHeight || 80; // Mặc định 80px
        const isMobile = isMobileBrowser();
        const isSmallScreen = isMobile || window.innerWidth < 768;
        const isPortrait = window.innerHeight > window.innerWidth;
        const use16to9Aspect = isSmallScreen && (isMobile || (isPortrait && window.innerWidth < 600));
        
        return {
            containerWidth: window.innerWidth,
            containerHeight: window.innerHeight,
            availableWidth: window.innerWidth,
            availableHeight: Math.max(0, window.innerHeight - toolboxHeight), // Trừ toolbox ngay từ đầu
            hasToolbox: Boolean(toolbox?.classList.contains('visible')),
            hasChatPane: false,
            hasParticipantsPane: false,
            chatPaneWidth: 0,
            participantsPaneWidth: 0,
            isSmallScreen,
            use16to9Aspect
        };
    }, []);
    
    const [viewportInfo, setViewportInfo] = useState(() => getInitialViewportInfo());
    const { classes, cx } = useStyles();


    const remotesMap = useSelector((s: IReduxState) => getRemoteParticipants(s));
    const remotes = remotesMap ? Array.from(remotesMap.values()) : [];
    const local = useSelector((s: IReduxState) => s["features/base/participants"]?.local);
    const localFlipX = useSelector((s: IReduxState) => s["features/base/settings"]?.localFlipX);
    const ordered = useMemo(() => [local, ...remotes].filter(Boolean), [local, remotes]);

    const tpl = immersive?.templateId ? IMMERSIVE_TEMPLATES[immersive.templateId] : undefined;
    const baseSlots = useMemo(
        () => getTemplateSlots(immersive?.templateId, immersive?.slotCount || DEFAULT_IMMERSIVE_SLOT_COUNT),
        [immersive?.templateId, immersive?.slotCount]
    );

    // Không cần adjustedSlots nữa vì sẽ tính trực tiếp khi render
    // Giữ nguyên baseSlots để sử dụng khi render

    const assignments = immersive?.assignments || {};

    const tracks = useSelector((s: IReduxState) => s["features/base/tracks"]);
    const isVideoOn = (pid: string) => {
        const t = getTrackByMediaTypeAndParticipant(tracks, MEDIA_TYPE.VIDEO, pid);
        return Boolean(t && !t.muted && t.jitsiTrack?.stream);
    };
    const participantIds = useMemo(() => ordered.map((p: any) => p.id), [ordered]);

    // Phát hiện viewport và UI elements
    const updateViewportInfo = useCallback(() => {
        if (!rootRef.current) {
            return;
        }
        
        const toolbox = document.getElementById('new-toolbox');
        const hasToolbox = toolbox && toolbox.classList.contains('visible');
        
        // Lấy kích thước thực tế của container (root div)
        // Container này đã được layout system tự động co lại khi có Chat/Participants pane
        const containerRect = rootRef.current.getBoundingClientRect();
        const containerWidth = containerRect.width;
        let containerHeight = containerRect.height;
        
        // Phát hiện màn hình nhỏ (mobile hoặc width < 768px)
        const isMobile = isMobileBrowser();
        const isSmallScreen = isMobile || window.innerWidth < 768;
        const isPortrait = window.innerHeight > window.innerWidth;
        
        // Quyết định có dùng tỷ lệ 16:9 không
        // Dùng 16:9 khi: màn hình nhỏ VÀ (mobile HOẶC portrait VÀ width < 600px)
        const use16to9Aspect = isSmallScreen && (isMobile || (isPortrait && window.innerWidth < 600));
        
        // Tính toán toolbox height - LUÔN dành chỗ cho toolbox để tránh overlap
        // Ngay cả khi toolbox chưa visible, vẫn phải trừ đi vì nó có thể xuất hiện bất cứ lúc nào
        let toolboxHeight = 80; // Chiều cao mặc định
        if (toolbox) {
            // Luôn lấy chiều cao thực tế của toolbox (kể cả khi chưa visible)
            // Toolbox có thể có chiều cao khác 0 ngay cả khi chưa visible
            const toolboxRect = toolbox.getBoundingClientRect();
            toolboxHeight = toolboxRect.height > 0 ? toolboxRect.height : 80;
        }
        
        // QUAN TRỌNG: Luôn trừ Toolbox height để đảm bảo slots không bị che
        // Điều này đúng cho cả trường hợp:
        // - Có sidebars: containerHeight đã được layout system điều chỉnh, vẫn cần trừ Toolbox
        // - Không có sidebars: containerHeight có thể = window.innerHeight và bao gồm Toolbox area
        // Vì vậy, LUÔN trừ Toolbox height trong mọi trường hợp
        
        // Tính toán không gian có sẵn bên trong container
        let availableWidth = containerWidth;
        let availableHeight = containerHeight - toolboxHeight;
        
        // Nếu dùng tỷ lệ 16:9, tính toán lại availableHeight dựa trên aspect ratio
        if (use16to9Aspect && availableWidth > 0) {
            // Tính height dựa trên tỷ lệ 16:9
            const target16to9Height = (availableWidth / 16) * 9;
            const maxAvailableHeight = window.innerHeight - toolboxHeight;
            
            // Nếu calculated height nhỏ hơn available height, dùng calculated
            // Điều này tạo letterboxing (black bars ở trên và dưới)
            if (target16to9Height < maxAvailableHeight) {
                availableHeight = target16to9Height;
            }
            // Nếu calculated height lớn hơn, vẫn dùng maxAvailableHeight để tránh overflow
        }
        
        // Đảm bảo availableHeight không âm
        if (availableHeight < 0) {
            // Fallback: lấy 80% của containerHeight gốc (trước khi trừ Toolbox)
            const originalHeight = containerRect.height;
            availableHeight = Math.max(originalHeight * 0.8, 400); // Tối thiểu 400px
        }
        
        // Giữ lại thông tin về Chat/Participants pane để sử dụng khi cần
        const actualChatWidth = isChatOpen ? chatWidth : 0;
        const actualParticipantsWidth = isParticipantsPaneOpen ? participantsPaneWidth : 0;
        
        setViewportInfo({
            containerWidth,
            containerHeight: containerRect.height, // Giữ lại height gốc để reference
            availableWidth,
            availableHeight,
            hasToolbox: Boolean(hasToolbox),
            hasChatPane: isChatOpen,
            hasParticipantsPane: isParticipantsPaneOpen,
            chatPaneWidth: actualChatWidth,
            participantsPaneWidth: actualParticipantsWidth,
            isSmallScreen,
            use16to9Aspect
        });
    }, [isChatOpen, chatWidth, isParticipantsPaneOpen, participantsPaneWidth]);

    // Gọi updateViewportInfo ngay khi component mount để có giá trị chính xác
    useEffect(() => {
        if (!rootRef.current) {
            return;
        }
        
        // Gọi ngay lần đầu (không delay) để tránh hiển thị sai
        updateViewportInfo();
        
        // Sau đó delay một chút để đảm bảo DOM đã được render hoàn toàn và tính lại
        const timeoutId1 = setTimeout(updateViewportInfo, 100);
        const timeoutId2 = setTimeout(updateViewportInfo, 300); // Thêm delay thứ 2 để chắc chắn
        
        const observer = new MutationObserver(updateViewportInfo);
        const toolbox = document.getElementById('new-toolbox');
        let toolboxResizeObserver: ResizeObserver | null = null;
        
        if (toolbox) {
            observer.observe(toolbox, { 
                attributes: true, 
                attributeFilter: ['class', 'style'] // Thêm style để catch mọi thay đổi
            });
            
            // Cũng observe khi toolbox thay đổi kích thước
            toolboxResizeObserver = new ResizeObserver(() => {
                updateViewportInfo();
            });
            toolboxResizeObserver.observe(toolbox);
        }
        
        // ResizeObserver để theo dõi thay đổi kích thước container - QUAN TRỌNG NHẤT
        const resizeObserver = new ResizeObserver((entries) => {
            // Đảm bảo luôn update khi container thay đổi
            for (const entry of entries) {
                if (entry.target === rootRef.current) {
                    updateViewportInfo();
                    break;
                }
            }
        });
        
        resizeObserver.observe(rootRef.current);
        
        // Listen window resize - QUAN TRỌNG: phải listen để update khi không có sidebars
        const handleResize = () => {
            // Force update ngay lập tức khi window resize
            updateViewportInfo();
        };
        
        // Cũng listen orientationchange cho mobile
        const handleOrientationChange = () => {
            setTimeout(updateViewportInfo, 100);
        };
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleOrientationChange);
        
        return () => {
            clearTimeout(timeoutId1);
            clearTimeout(timeoutId2);
            observer.disconnect();
            toolboxResizeObserver?.disconnect();
            resizeObserver.disconnect();
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleOrientationChange);
        };
    }, [updateViewportInfo]);
    
    // Cập nhật lại khi chat hoặc participants pane state thay đổi
    // HOẶC khi window resize - đảm bảo responsive luôn hoạt động
    useEffect(() => {
        // Gọi ngay lần đầu
        updateViewportInfo();
        
        // Delay một chút để layout system kịp cập nhật container size
        const timeoutId1 = setTimeout(updateViewportInfo, 150);
        const timeoutId2 = setTimeout(updateViewportInfo, 300); // Delay thêm để chắc chắn
        
        return () => {
            clearTimeout(timeoutId1);
            clearTimeout(timeoutId2);
        };
    }, [isChatOpen, chatWidth, isParticipantsPaneOpen, participantsPaneWidth, updateViewportInfo]);
    
    // Thêm effect riêng để force update khi window resize (không phụ thuộc vào sidebars)
    useEffect(() => {
        const handleResize = () => {
            updateViewportInfo();
        };
        
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [updateViewportInfo]);

    // Keep assignments in sync with participants/tracks:
    // - Initialize on first enable
    // - Remove left participants
    // - Auto-fill empty slots with newly available video tracks
    useEffect(() => {
        if (!immersive?.enabled || !tpl) {
            return;
        }

        // console.log('🔍 [ImmersiveView] Current immersive state:', {
        //     enabled: immersive?.enabled,
        //     templateId: immersive?.templateId,
        //     slotCount: immersive?.slotCount,
        //     assignments: immersive?.assignments,
        //     isOwner
        // });

        const current: { [slotIndex: number]: string } = { ...(immersive?.assignments || {}) };
        let changed = false;

        // If no assignments yet, initialize with current participants (preserve avatar fallback)
        // Chỉ owner mới được tạo assignments ban đầu, user sẽ nhận từ owner
        if (!Object.keys(current).length) {
            if (isOwner) {
                // console.log('🎯 [ImmersiveView] Owner initializing assignments:', ordered.map(p => p?.id));
                ordered.forEach((p: any, i: number) => {
                    if (i < baseSlots.length) {
                        current[i] = p.id;
                        changed = true;
                    }
                });
            }
        }

        // Clean assignments for participants that left or for slots out of range
        const presentIds = new Set(participantIds);
        Object.keys(current).forEach((k) => {
            const idx = Number(k);
            const pid = current[idx];
            if (idx >= baseSlots.length || !presentIds.has(pid)) {
                delete current[idx];
                changed = true;
            }
        });

        // Determine candidates to auto-fill: prefer participants with active video first,
        // then fill remaining empty slots with participants without video
        const assignedIds = new Set(Object.values(current));
        const candidatesVideo = ordered.filter((p: any) => !assignedIds.has(p.id) && isVideoOn(p.id));
        const candidatesNoVideo = ordered.filter((p: any) => !assignedIds.has(p.id) && !isVideoOn(p.id));

        const fillEmpties = (arr: any[]) => {
            if (!arr.length) {
                return;
            }
            for (let i = 0; i < baseSlots.length && arr.length; i++) {
                if (current[i] === undefined) {
                    const nextP = arr.shift();
                    if (nextP) {
                        current[i] = nextP.id;
                        changed = true;
                    }
                }
            }
        };

        fillEmpties(candidatesVideo);
        fillEmpties(candidatesNoVideo);

        if (changed) {
            dispatch(setImmersiveAssignments(current));
        }
    }, [dispatch, immersive?.enabled, tpl?.id, participantIds.join(","), tracks, immersive?.assignments, baseSlots.length]);

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDragStart = (index: number) => () => {
        // Chỉ owner mới được drag
        if (!isOwner) {
            // console.log('❌ [ImmersiveView] Only owners can drag participants');
            return;
        }
        setDragIndex(index);
    };
    const handleDrop = (index: number) => (e?: React.DragEvent) => {
        // Chỉ owner mới được drop
        if (!isOwner) {
            // console.log('❌ [ImmersiveView] Only owners can drop participants');
            return;
        }
        const dataPid = e?.dataTransfer?.getData("application/x-participant-id");

        if (dataPid) {
            const next = { ...assignments } as { [slotIndex: number]: string };
            const fromIdxStr = Object.keys(next).find((k) => next[Number(k)] === dataPid);
            const fromIdx = fromIdxStr !== undefined ? Number(fromIdxStr) : null;
            const currentAtTarget = next[index];

            if (fromIdx !== null) {
                next[fromIdx] = currentAtTarget;
                next[index] = dataPid;
            } else {
                next[index] = dataPid;
            }
            // console.log('🎯 [ImmersiveView] Drag & drop assignments:', next);
            dispatch(setImmersiveAssignments(next));
            setDragIndex(null);
            return;
        }

        if (dragIndex !== null && dragIndex !== index) {
            // console.log('🎯 [ImmersiveView] Swap slots:', dragIndex, '->', index);
            dispatch(swapImmersiveSlots(dragIndex, index));
        }
        setDragIndex(null);
    };

    // Tránh return sớm để không thay đổi số lượng hook giữa các lần render
    const immersiveActive = Boolean(immersive?.enabled && tpl);

    // Root container luôn full-size; tạo canvas (vùng 16:9) bên trong
    const rootStyle = useMemo(() => ({ transition: 'all 0.3s ease-in-out' as const }), []);

    const canvasStyle = useMemo(() => {
        if (viewportInfo.use16to9Aspect && viewportInfo.availableWidth > 0) {
            const targetHeight = (viewportInfo.availableWidth / 16) * 9;
            return {
                position: 'absolute' as const,
                left: 0,
                right: 0,
                height: `${targetHeight}px`,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1
            };
        }
        return {
            position: 'absolute' as const,
            inset: 0,
            zIndex: 1
        };
    }, [viewportInfo.use16to9Aspect, viewportInfo.availableWidth]);

    return (
        <div 
            ref={rootRef}
            className={classes.root}
            style={rootStyle}
        >
            {immersiveActive && (
                <>
                    {/* Mask đen che background gallery bên ngoài canvas */}
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: '#000', zIndex: 0 }} />
                    <div style={canvasStyle}>
                        <div 
                            className={classes.background} 
                            style={{ backgroundImage: `url(${tpl!.backgroundUrl})` }}
                        />
                        {/* Background only; slots are rendered below with absolute positions and adjusted top offset */}
                    </div>
                </>
            )}
            {immersiveActive && baseSlots.map((s, idx) => {
                const pid = assignments[idx];
                const p = ordered.find((pp: any) => pp.id === pid);
                let videoEl: React.ReactNode = null;

                if (p) {
                    const track = getTrackByMediaTypeAndParticipant(tracks, MEDIA_TYPE.VIDEO, p.id);

                    if (track && !track.muted && track.jitsiTrack?.stream) {
                        const isLocalVideo = p.id === local?.id;
                        const shouldMirror = isLocalVideo && localFlipX;
                        videoEl = (
                            <div className={classes.videoWrapper}>
                                <video
                                    autoPlay
                                    muted
                                    playsInline
                                    ref={(el) => {
                                        if (el && el.srcObject !== track.jitsiTrack.stream) {
                                            el.srcObject = track.jitsiTrack.stream;
                                        }
                                    }}
                                    className={shouldMirror ? classes.videoLocal : classes.videoRemote}
                                />
                                <div className={classes.videoOverlay} />
                            </div>
                        );
                    } else {
                        // Tính toán kích thước avatar responsive theo slot thực tế
                        // Dựa trên kích thước slot đã quy đổi ra pixel (finalWidth/finalHeight)
                        // Ước lượng kích thước slot dựa trên phần trăm slot và kích thước container hiện tại
                        const slotWidthPxEst = (s.w / 100) * viewportInfo.containerWidth;
                        const slotHeightPxEst = (s.h / 100) * viewportInfo.availableHeight;
                        const slotInnerPx = Math.min(slotWidthPxEst, slotHeightPxEst);
                        const baseAvatar = slotInnerPx * 0.48; // Tỷ lệ mặc định của avatar trong slot
                        // Nếu màn hình nhỏ, tăng một chút để dễ đọc hơn
                        const mobileBoost = viewportInfo.isSmallScreen ? 1.1 : 1.0;
                        // Giới hạn min/max hợp lý
                        const avatarSize = Math.max(48, Math.min(140, baseAvatar * mobileBoost));

                        videoEl = (
                            <div className={classes.avatarWrapper}>
                                <Avatar size={avatarSize} participantId={p.id} />
                            </div>
                        );
                    }
                }

                function formatNameOrEmail(input: string, slotWidth: number) : string {
                    if (!input) return "";

                    // Nếu là email
                    if (input.includes("@")) {
                        return input.split("@")[0];
                    }

                    // Nếu là họ tên
                    const parts = input.trim().split(/\s+/);
                    const length = parts.length;

                    // Tăng giới hạn độ dài dựa trên kích thước slot
                    const maxLength = slotWidth > 25 ? 35 : slotWidth > 20 ? 28 : slotWidth > 15 ? 22 : 18;
                    
                    if (length === 1) {
                        return parts[0].length > maxLength ? parts[0].substring(0, maxLength - 3) + "..." : parts[0];
                    }
                    
                    if (length === 2) {
                        const fullName = parts.join(" ");
                        return fullName.length > maxLength ? fullName.substring(0, maxLength - 3) + "..." : fullName;
                    }
                    
                    if (length === 3) {
                        const fullName = parts.join(" ");
                        return fullName.length > maxLength ? fullName.substring(0, maxLength - 3) + "..." : fullName;
                    }

                    // Tên dài hơn 3 từ -> rút gọn thông minh nhưng ưu tiên hiển thị nhiều hơn
                    const initials = parts
                        .slice(0, -1)
                        .map((word: string) => word[0].toUpperCase())
                        .join("");
                    const lastName = parts[length - 1];
                    const shortName = `${initials}.${lastName}`;
                    
                    return shortName.length > maxLength ? shortName.substring(0, maxLength - 3) + "..." : shortName;
                }

                // Tính toán vị trí và kích thước bằng pixel dựa trên container thực tế
                // QUAN TRỌNG: Luôn tính toán dựa trên container thực tế, không phụ thuộc vào có sidebars hay không
                // Container đã được layout system tự động điều chỉnh (có hoặc không có sidebars)
                // Vì vậy chỉ cần scale slots theo container thực tế
                
                const containerWidth = viewportInfo.containerWidth;
                const availableHeight = viewportInfo.availableHeight; // Đã trừ toolbox height
                const containerHeight = viewportInfo.containerHeight; // Chiều cao gốc của container (reference)
                
                // Đảm bảo có giá trị hợp lệ
                if (!containerWidth || containerWidth <= 0 || !availableHeight || availableHeight <= 0) {
                    // Fallback nếu chưa có giá trị hợp lệ
                    console.warn('[ImmersiveView] Invalid container dimensions:', { containerWidth, availableHeight });
                    return null;
                }
                
                // Tính toán tỷ lệ scale từ viewport gốc sang container thực tế
                // baseSlots được tính với viewport = 100% (window.innerWidth x window.innerHeight)
                // Cần scale xuống container thực tế (containerWidth x availableHeight)
                const widthScale = containerWidth / window.innerWidth;
                const heightScale = availableHeight / window.innerHeight;
                
                // Tính toán vị trí và kích thước slots trong container thực tế
                // Slots được scale để phù hợp với không gian thực tế có sẵn
                const leftPx = (s.x / 100) * containerWidth;
                const topPx = (s.y / 100) * availableHeight; // Dùng availableHeight để tránh overlap với toolbox
                const widthPx = (s.w / 100) * containerWidth;
                const heightPx = (s.h / 100) * availableHeight; // Dùng availableHeight để tránh overlap
                
                // Đảm bảo slot không render dưới toolbox hoặc ngoài container
                // Tính toán maxTop để đảm bảo slot hoàn toàn nằm trong availableHeight
                const maxTop = Math.max(0, availableHeight - heightPx);
                const finalTop = Math.min(Math.max(0, topPx), maxTop);
                const canvasOffsetTop = viewportInfo.use16to9Aspect
                    ? Math.max(0, (window.innerHeight - availableHeight) / 2)
                    : 0;
                
                // Đảm bảo height không vượt quá availableHeight
                const finalHeight = Math.min(heightPx, availableHeight - finalTop);
                
                // Đảm bảo width không vượt quá containerWidth
                const finalWidth = Math.min(widthPx, containerWidth - leftPx);
                const finalLeft = Math.max(0, Math.min(leftPx, containerWidth - finalWidth));
                
                // Tính toán các giá trị responsive cho thành phần tên dựa trên slot width thực tế (finalWidth)
                // QUAN TRỌNG: Tính toán phải dựa trên slot width thực tế, tự động scale khi có sidebars
                const slotWidthPx = finalWidth;
                const slotWidthPercent = (slotWidthPx / containerWidth) * 100; // % của container thực tế
                
                // Tính hệ số scale dựa trên việc có sidebars hay không
                // Khi có sidebars, containerWidth nhỏ hơn, nên cần scale down các giá trị
                const hasSidebars = viewportInfo.hasChatPane || viewportInfo.hasParticipantsPane;
                let scaleFactor = hasSidebars 
                    ? Math.min(1, containerWidth / window.innerWidth) // Scale down khi có sidebars
                    : 1;
                // Trên màn hình nhỏ, không để scale nhỏ hơn 0.85 để giữ khả năng đọc
                if (viewportInfo.isSmallScreen) {
                    scaleFactor = Math.max(0.85, scaleFactor);
                }
                
                // Tính toán fontSize responsive dựa trên slot width thực tế và scale factor
                // Khi container bị co (có sidebars), fontSize sẽ tự động nhỏ hơn
                // Tăng fontSize cho chế độ 12 và 16 slots để tên hiển thị rõ hơn
                let fontSize: string;
                const baseFontSize = slotWidthPx * 0.045; // Base size dựa trên slot width
                const textBoost = viewportInfo.isSmallScreen ? 1.15 : 1; // Tăng nhẹ trên mobile
                if (baseSlots.length >= 16) {
                    // 16 slots: tăng fontSize lên để tên lớn hơn, dễ đọc hơn
                    fontSize = `clamp(${0.9 * scaleFactor * textBoost}rem, ${slotWidthPx * 0.06 * scaleFactor * textBoost}px, ${1.2 * scaleFactor * textBoost}rem)`;
                } else if (baseSlots.length >= 12) {
                    // 12 slots: tăng fontSize lên để tên lớn hơn
                    fontSize = `clamp(${0.95 * scaleFactor * textBoost}rem, ${slotWidthPx * 0.062 * scaleFactor * textBoost}px, ${1.3 * scaleFactor * textBoost}rem)`;
                } else if (baseSlots.length >= 9) {
                    fontSize = `clamp(${0.8 * scaleFactor * textBoost}rem, ${baseFontSize * scaleFactor * textBoost}px, ${1.1 * scaleFactor * textBoost}rem)`;
                } else if (slotWidthPercent > 25) {
                    fontSize = `clamp(${1 * scaleFactor * textBoost}rem, ${slotWidthPx * 0.055 * scaleFactor * textBoost}px, ${1.6 * scaleFactor * textBoost}rem)`;
                } else if (slotWidthPercent > 20) {
                    fontSize = `clamp(${0.9 * scaleFactor * textBoost}rem, ${slotWidthPx * 0.05 * scaleFactor * textBoost}px, ${1.4 * scaleFactor * textBoost}rem)`;
                } else {
                    fontSize = `clamp(${0.8 * scaleFactor * textBoost}rem, ${baseFontSize * scaleFactor * textBoost}px, ${1.1 * scaleFactor * textBoost}rem)`;
                }
                
                // Tính toán padding responsive với scale factor
                // Tăng padding cho 12 và 16 slots để thành phần tên lớn hơn, dễ đọc hơn
                let padding: string;
                if (baseSlots.length >= 16) {
                    // 16 slots: tăng padding để thành phần tên lớn hơn
                    const verticalPadding = Math.max(4, slotWidthPx * 0.02) * scaleFactor * textBoost;
                    const horizontalPadding = Math.max(12, slotWidthPx * 0.04) * scaleFactor * textBoost;
                    padding = `${verticalPadding}px ${horizontalPadding}px`;
                } else if (baseSlots.length >= 12) {
                    // 12 slots: tăng padding để thành phần tên lớn hơn
                    const verticalPadding = Math.max(4.5, slotWidthPx * 0.022) * scaleFactor * textBoost;
                    const horizontalPadding = Math.max(14, slotWidthPx * 0.045) * scaleFactor * textBoost;
                    padding = `${verticalPadding}px ${horizontalPadding}px`;
                } else if (baseSlots.length >= 9) {
                    const verticalPadding = Math.max(4, slotWidthPx * 0.018) * scaleFactor * textBoost;
                    const horizontalPadding = Math.max(15, slotWidthPx * 0.04) * scaleFactor * textBoost;
                    padding = `${verticalPadding}px ${horizontalPadding}px`;
                } else if (slotWidthPercent > 25) {
                    const verticalPadding = Math.max(5, slotWidthPx * 0.02) * scaleFactor * textBoost;
                    const horizontalPadding = Math.max(25, slotWidthPx * 0.06) * scaleFactor * textBoost;
                    padding = `${verticalPadding}px ${horizontalPadding}px`;
                } else if (slotWidthPercent > 20) {
                    const verticalPadding = Math.max(4, slotWidthPx * 0.018) * scaleFactor * textBoost;
                    const horizontalPadding = Math.max(20, slotWidthPx * 0.05) * scaleFactor * textBoost;
                    padding = `${verticalPadding}px ${horizontalPadding}px`;
                } else {
                    const verticalPadding = Math.max(3, slotWidthPx * 0.015) * scaleFactor * textBoost;
                    const horizontalPadding = Math.max(15, slotWidthPx * 0.04) * scaleFactor * textBoost;
                    padding = `${verticalPadding}px ${horizontalPadding}px`;
                }
                
                // Tính toán border responsive với scale factor
                // Tăng borderWidth cho 12 và 16 slots để thành phần tên nổi bật hơn
                let borderWidth: string;
                if (baseSlots.length >= 16) {
                    // 16 slots: tăng borderWidth
                    borderWidth = `${Math.max(3, slotWidthPx * 0.015) * scaleFactor * textBoost}px`;
                } else if (baseSlots.length >= 12) {
                    // 12 slots: tăng borderWidth
                    borderWidth = `${Math.max(3.5, slotWidthPx * 0.016) * scaleFactor * textBoost}px`;
                } else if (baseSlots.length >= 9) {
                    borderWidth = `${Math.max(3, slotWidthPx * 0.012) * scaleFactor * textBoost}px`;
                } else if (slotWidthPercent > 25) {
                    borderWidth = `${Math.max(8, slotWidthPx * 0.025) * scaleFactor * textBoost}px`;
                } else if (slotWidthPercent > 20) {
                    borderWidth = `${Math.max(6, slotWidthPx * 0.02) * scaleFactor * textBoost}px`;
                } else {
                    borderWidth = `${Math.max(4, slotWidthPx * 0.015) * scaleFactor * textBoost}px`;
                }
                
                // Tính toán borderRadius responsive với scale factor
                // Tăng borderRadius cho 12 và 16 slots để thành phần tên đẹp hơn
                let borderRadius: string;
                if (baseSlots.length >= 16) {
                    // 16 slots: tăng borderRadius
                    borderRadius = `${Math.max(1, slotWidthPx * 0.01) * scaleFactor * textBoost}rem`;
                } else if (baseSlots.length >= 12) {
                    // 12 slots: tăng borderRadius
                    borderRadius = `${Math.max(1.1, slotWidthPx * 0.011) * scaleFactor * textBoost}rem`;
                } else if (baseSlots.length >= 9) {
                    borderRadius = `${Math.max(1.2, slotWidthPx * 0.012) * scaleFactor * textBoost}rem`;
                } else if (slotWidthPercent > 25) {
                    borderRadius = `${Math.max(2.5, slotWidthPx * 0.025) * scaleFactor * textBoost}rem`;
                } else if (slotWidthPercent > 20) {
                    borderRadius = `${Math.max(2, slotWidthPx * 0.02) * scaleFactor * textBoost}rem`;
                } else {
                    borderRadius = `${Math.max(1.5, slotWidthPx * 0.015) * scaleFactor * textBoost}rem`;
                }
                
                // Tùy chỉnh thêm cho mobile: đảm bảo chiều cao thẻ tên không vượt quá 28% chiều cao slot
                if (viewportInfo.isSmallScreen) {
                    let fontPx = Math.min(32, Math.max(12, slotWidthPx * 0.05)) * scaleFactor; // baseline theo slot
                    let vPadNum = Math.max(3, slotWidthPx * 0.02) * scaleFactor;
                    let hPadNum = Math.max(12, slotWidthPx * 0.04) * scaleFactor;
                    let bWidthNum = Math.max(2, slotWidthPx * 0.012) * scaleFactor;
                    const maxNameHeight = finalHeight * 0.28;
                    const estimatedNameHeight = fontPx * 1.2 + vPadNum * 2 + bWidthNum * 2;
                    if (estimatedNameHeight > maxNameHeight) {
                        const k = maxNameHeight / estimatedNameHeight;
                        fontPx *= k;
                        vPadNum *= k;
                        hPadNum *= k;
                        bWidthNum *= k;
                    }
                    fontSize = `${fontPx}px`;
                    padding = `${vPadNum}px ${hPadNum}px`;
                    borderWidth = `${bWidthNum}px`;
                    // Cập nhật borderRadius phù hợp với mobile
                    borderRadius = `${Math.max(12, slotWidthPx * 0.05)}px`;
                }

                // Tính toán maxWidth responsive - QUAN TRỌNG: phải tỷ lệ với slot width thực tế
                // Khi có sidebars, slot width nhỏ hơn nên maxWidth cũng nhỏ hơn tự động
                // Tăng maxWidth cho 12 và 16 slots để hiển thị tên dài hơn
                let nameMaxWidth: number;
                if (baseSlots.length >= 16) {
                    // 16 slots: tăng maxWidth để hiển thị tên rõ hơn
                    nameMaxWidth = Math.min(slotWidthPx * 1.3 * textBoost, containerWidth * 0.45);
                } else if (baseSlots.length >= 12) {
                    // 12 slots: tăng maxWidth để hiển thị tên rõ hơn
                    nameMaxWidth = Math.min(slotWidthPx * 1.35 * textBoost, containerWidth * 0.46);
                } else {
                    // Các chế độ khác: giữ nguyên
                    nameMaxWidth = Math.min(
                        slotWidthPx * 1.2 * textBoost, // 120% của slot width
                        slotWidthPx * 0.95  // Tăng một chút để dễ đọc trên mobile
                    );
                }

                return (
                    <div
                        key={idx}
                        className={cx(classes.slot, {
                            [classes.slotHighlight]: pid === local?.id,
                            [classes.slotNormal]: pid !== local?.id,
                            [classes.slotDisabled]: !isOwner, // Disable cho user không phải owner
                        })}
                        style={{
                            borderRadius: "1.5rem",
                            border: "8px solid #41b6fb",
                            left: `${finalLeft}px`, // Dùng finalLeft để đảm bảo không vượt quá container
                            top: `${finalTop + canvasOffsetTop}px`, // Bù offset để nằm trong canvas 16:9
                            width: `${finalWidth}px`, // Dùng finalWidth để đảm bảo không vượt quá container
                            height: `${finalHeight}px`, // Dùng finalHeight để đảm bảo không vượt quá availableHeight
                            boxShadow: "0 8px 32px rgba(65, 182, 251, 0.4), inset 0 0 20px rgba(65, 182, 251, 0.1)",
                            transition: "all 0.3s ease-in-out",
                            background: "linear-gradient(135deg, rgba(65, 182, 251, 0.05) 0%, rgba(65, 182, 251, 0.02) 100%)",
                        }}
                    >
                        <div
                            draggable={Boolean(p) && isOwner} // Chỉ owner mới được drag
                            onDragStart={handleDragStart(idx)}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop(idx)}
                            className={classes.slotContent}
                        >
                            {videoEl}
                            {p && (
                                <div
                                    style={{
                                        position: "absolute",
                                        left: "50%",
                                        bottom: "0",
                                        transform: "translate(-50%,50%)",
                                        padding: padding, // Responsive padding dựa trên slot width thực tế
                                        background: "linear-gradient(90deg, #BCF2FF 0%, #FFF 50.2%, #BCF2FF 100%)",
                                        color: "#015d92ff",
                                        fontSize: fontSize, // Responsive fontSize dựa trên slot width thực tế
                                        lineHeight: 1.3,
                                        pointerEvents: "none",
                                        border: `${borderWidth} solid #41b6fb`, // Responsive border dựa trên slot width thực tế
                                        borderRadius: borderRadius, // Responsive borderRadius dựa trên slot width thực tế
                                        zIndex: 1000,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        maxWidth: `${nameMaxWidth}px`, // Responsive maxWidth dựa trên slot width thực tế (pixel)
                                        textAlign: "center",
                                    }}
                                >
                                    {formatNameOrEmail(p.name || "CMC ATIer", slotWidthPercent)}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
