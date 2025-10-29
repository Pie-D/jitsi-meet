import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { makeStyles } from "tss-react/mui";

import { IReduxState } from "../../app/types";
import Avatar from "../../base/avatar/components/Avatar";
import { MEDIA_TYPE } from "../../base/media/constants";
import { getRemoteParticipants } from "../../base/participants/functions";
import { getTrackByMediaTypeAndParticipant } from "../../base/tracks/functions.any";
import { setImmersiveAssignments, swapImmersiveSlots } from "../actions";
import { DEFAULT_IMMERSIVE_SLOT_COUNT } from "../constants";
import "../reducer";
import { IMMERSIVE_TEMPLATES, getTemplateSlots } from "../templates";
import { isLocalParticipantModerator } from "../../base/participants/functions";

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
        backgroundPosition: "center",
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
        opacity: 0.7, // Làm mờ slot
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
    const isModerator = useSelector(isLocalParticipantModerator);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [viewportInfo, setViewportInfo] = useState({ 
        availableWidth: window.innerWidth, 
        availableHeight: window.innerHeight,
        hasToolbox: false,
        hasParticipantsPane: false
    });
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

    // Điều chỉnh vị trí slots dựa trên viewport thực tế
    const adjustedSlots = useMemo(() => {
        if (!baseSlots.length) return baseSlots;
        
        const { availableWidth, availableHeight, hasToolbox, hasParticipantsPane } = viewportInfo;
        
        // Tính toán tỷ lệ điều chỉnh
        const widthRatio = availableWidth / window.innerWidth;
        const heightRatio = availableHeight / window.innerHeight;
        
        // Điều chỉnh vị trí slots nhưng giữ nguyên kích thước
        // Vì slots đã được nhóm thành khối và căn giữa
        return baseSlots.map(slot => ({
            ...slot,
            x: slot.x * widthRatio,
            y: slot.y * heightRatio,
            w: slot.w, // Giữ nguyên kích thước
            h: slot.h  // Giữ nguyên kích thước
        }));
    }, [baseSlots, viewportInfo]);

    const assignments = immersive?.assignments || {};

    const tracks = useSelector((s: IReduxState) => s["features/base/tracks"]);
    const isVideoOn = (pid: string) => {
        const t = getTrackByMediaTypeAndParticipant(tracks, MEDIA_TYPE.VIDEO, pid);
        return Boolean(t && !t.muted && t.jitsiTrack?.stream);
    };
    const participantIds = useMemo(() => ordered.map((p: any) => p.id), [ordered]);

    // Phát hiện viewport và UI elements
    const updateViewportInfo = useCallback(() => {
        const toolbox = document.getElementById('new-toolbox');
        const participantsPane = document.getElementById('participants-pane');
        
        const hasToolbox = toolbox && toolbox.classList.contains('visible');
        const hasParticipantsPane = participantsPane && participantsPane.style.display !== 'none';
        
        // Tính toán không gian có sẵn
        let availableWidth = window.innerWidth;
        let availableHeight = window.innerHeight;
        
        if (hasParticipantsPane) {
            availableWidth -= 315; // Chiều rộng participants pane
        }
        
        // Cải thiện logic tính toán toolbox height
        if (hasToolbox) {
            // Lấy chiều cao thực tế của toolbox thay vì dùng giá trị cố định
            const toolboxHeight = toolbox?.clientHeight || 80;
            availableHeight -= toolboxHeight;
        } else {
            // Ngay cả khi toolbox chưa visible, vẫn dành chỗ cho nó để tránh overlap
            // Vì toolbox có thể xuất hiện bất cứ lúc nào
            const toolboxHeight = 80; // Chiều cao dự kiến của toolbox
            availableHeight -= toolboxHeight;
        }
        
        setViewportInfo({
            availableWidth,
            availableHeight,
            hasToolbox: Boolean(hasToolbox),
            hasParticipantsPane: Boolean(hasParticipantsPane)
        });
    }, []);

    // Theo dõi thay đổi viewport
    useEffect(() => {
        // Delay một chút để đảm bảo DOM đã được render hoàn toàn
        const timeoutId = setTimeout(updateViewportInfo, 100);
        
        const observer = new MutationObserver(updateViewportInfo);
        const toolbox = document.getElementById('new-toolbox');
        const participantsPane = document.getElementById('participants-pane');
        
        if (toolbox) {
            observer.observe(toolbox, { 
                attributes: true, 
                attributeFilter: ['class'] 
            });
        }
        
        if (participantsPane) {
            observer.observe(participantsPane, { 
                attributes: true, 
                attributeFilter: ['style'] 
            });
        }
        
        window.addEventListener('resize', updateViewportInfo);
        
        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
            window.removeEventListener('resize', updateViewportInfo);
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

        console.log('🔍 [ImmersiveView] Current immersive state:', {
            enabled: immersive?.enabled,
            templateId: immersive?.templateId,
            slotCount: immersive?.slotCount,
            assignments: immersive?.assignments,
            isModerator
        });

        const current: { [slotIndex: number]: string } = { ...(immersive?.assignments || {}) };
        let changed = false;

        // If no assignments yet, initialize with current participants (preserve avatar fallback)
        // Chỉ moderator mới được tạo assignments ban đầu, user sẽ nhận từ moderator
        if (!Object.keys(current).length) {
            if (isModerator) {
                console.log('🎯 [ImmersiveView] Moderator initializing assignments:', ordered.map(p => p?.id));
                ordered.forEach((p: any, i: number) => {
                    if (i < baseSlots.length) {
                        current[i] = p.id;
                        changed = true;
                    }
                });
            } else {
                console.log('❌ [ImmersiveView] User waiting for assignments from moderator');
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
        // Chỉ moderator mới được drag
        if (!isModerator) {
            console.log('❌ [ImmersiveView] Only moderators can drag participants');
            return;
        }
        setDragIndex(index);
    };
    const handleDrop = (index: number) => (e?: React.DragEvent) => {
        // Chỉ moderator mới được drop
        if (!isModerator) {
            console.log('❌ [ImmersiveView] Only moderators can drop participants');
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
            console.log('🎯 [ImmersiveView] Drag & drop assignments:', next);
            dispatch(setImmersiveAssignments(next));
            setDragIndex(null);
            return;
        }

        if (dragIndex !== null && dragIndex !== index) {
            console.log('🎯 [ImmersiveView] Swap slots:', dragIndex, '->', index);
            dispatch(swapImmersiveSlots(dragIndex, index));
        }
        setDragIndex(null);
    };

    if (!immersive?.enabled || !tpl) {
        return null;
    }

    return (
        <div 
            className={classes.root}
            style={{
                // Đảm bảo ImmersiveView không bị che khuất
                // Luôn dành chỗ cho toolbox, ngay cả khi chưa visible
                paddingBottom: '80px', // Luôn dành chỗ cho toolbox
                paddingRight: viewportInfo.hasParticipantsPane ? '315px' : '0px',
                transition: 'padding 0.3s ease-in-out'
            }}
        >
            <div className={classes.background} style={{ backgroundImage: `url(${tpl.backgroundUrl})` }} />
            {adjustedSlots.map((s, idx) => {
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
                        // Tính toán kích thước avatar dựa trên số lượng slot
                        const slotCount = baseSlots.length;
                        let avatarSize = 128; // Mặc định cho ít slot
                        
                        if (slotCount >= 16) {
                            avatarSize = 64; // 4x4 grid
                        } else if (slotCount >= 9) {
                            avatarSize = 80; // 3x3 grid
                        } else if (slotCount >= 6) {
                            avatarSize = 96; // 2x3 hoặc 3x2 grid
                        } else if (slotCount >= 4) {
                            avatarSize = 112; // 2x2 grid
                        }
                        
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

                return (
                    <div
                        key={idx}
                        className={cx(classes.slot, {
                            [classes.slotHighlight]: pid === local?.id,
                            [classes.slotNormal]: pid !== local?.id,
                            [classes.slotDisabled]: !isModerator, // Disable cho user
                        })}
                        style={{
                            borderRadius: "1.5rem",
                            border: "8px solid #41b6fb",
                            left: `${s.x}%`,
                            top: `${s.y}%`,
                            width: `${s.w}%`,
                            height: `${s.h}%`,
                            boxShadow: "0 8px 32px rgba(65, 182, 251, 0.4), inset 0 0 20px rgba(65, 182, 251, 0.1)",
                            transition: "all 0.3s ease-in-out",
                            background: "linear-gradient(135deg, rgba(65, 182, 251, 0.05) 0%, rgba(65, 182, 251, 0.02) 100%)",
                        }}
                    >
                        <div
                            draggable={Boolean(p) && isModerator} // Chỉ moderator mới được drag
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
                                        padding: baseSlots.length >= 16 ? "3px 10px" : baseSlots.length >= 9 ? "4px 15px" : s.w > 25 ? "5px 25px" : s.w > 20 ? "4px 20px" : "3px 15px",
                                        background: "linear-gradient(90deg, #BCF2FF 0%, #FFF 50.2%, #BCF2FF 100%)",
                                        color: "#015d92ff",
                                        fontSize: baseSlots.length >= 16 ? "clamp(0.7rem, 1.4vw, 0.9rem)" : baseSlots.length >= 9 ? "clamp(0.8rem, 1.7vw, 1.1rem)" : s.w > 25 ? "clamp(1rem, 2.8vw, 1.6rem)" : s.w > 20 ? "clamp(0.9rem, 2.2vw, 1.4rem)" : "clamp(0.8rem, 1.7vw, 1.1rem)",
                                        lineHeight: 1.3,
                                        pointerEvents: "none",
                                        border: baseSlots.length >= 16 ? "2px solid #41b6fb" : baseSlots.length >= 9 ? "3px solid #41b6fb" : s.w > 25 ? "8px solid #41b6fb" : s.w > 20 ? "6px solid #41b6fb" : "4px solid #41b6fb",
                                        borderRadius: baseSlots.length >= 16 ? "0.8rem" : baseSlots.length >= 9 ? "1.2rem" : s.w > 25 ? "2.5rem" : s.w > 20 ? "2rem" : "1.5rem",
                                        zIndex: 1000,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        maxWidth: `${Math.min(s.w * 1.2, 35)}vw`, // Tăng kích thước để hiển thị tên dài hơn
                                        textAlign: "center",
                                    }}
                                >
                                    {formatNameOrEmail(p.name || "CMC ATIer", s.w)}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
