import React, { useEffect, useMemo, useState } from "react";
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

const useStyles = makeStyles()(() => ({
    root: {
        position: "absolute",
        inset: 0,
    },
    background: {
        position: "absolute",
        inset: 0,
        backgroundSize: "cover",
        // backgroundPosition: "center",
    },
    slot: {
        position: "absolute",
        boxSizing: "border-box",
        // overflow: "hidden",
        background: "rgba(0,0,0,0.05)",
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
    video: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: "4.4rem",
    },
    avatarWrapper: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
}));

export default function ImmersiveView() {
    const dispatch = useDispatch();
    const immersive = useSelector((state: IReduxState) => state["features/immersive-view"]);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const { classes, cx } = useStyles();

    const remotesMap = useSelector((s: IReduxState) => getRemoteParticipants(s));
    const remotes = remotesMap ? Array.from(remotesMap.values()) : [];
    const local = useSelector((s: IReduxState) => s["features/base/participants"]?.local);
    const ordered = useMemo(() => [local, ...remotes].filter(Boolean), [local, remotes]);

    const tpl = immersive?.templateId ? IMMERSIVE_TEMPLATES[immersive.templateId] : undefined;
    const slots = useMemo(
        () => getTemplateSlots(immersive?.templateId, immersive?.slotCount || DEFAULT_IMMERSIVE_SLOT_COUNT),
        [immersive?.templateId, immersive?.slotCount]
    );

    const assignments = immersive?.assignments || {};

    const tracks = useSelector((s: IReduxState) => s["features/base/tracks"]);
    const isVideoOn = (pid: string) => {
        const t = getTrackByMediaTypeAndParticipant(tracks, MEDIA_TYPE.VIDEO, pid);
        return Boolean(t && !t.muted && t.jitsiTrack?.stream);
    };
    const participantIds = useMemo(() => ordered.map((p: any) => p.id), [ordered]);

    // Keep assignments in sync with participants/tracks:
    // - Initialize on first enable
    // - Remove left participants
    // - Auto-fill empty slots with newly available video tracks
    useEffect(() => {
        if (!immersive?.enabled || !tpl) {
            return;
        }

        const current: { [slotIndex: number]: string } = { ...(immersive?.assignments || {}) };
        let changed = false;

        // If no assignments yet, initialize with current participants (preserve avatar fallback)
        if (!Object.keys(current).length) {
            ordered.forEach((p: any, i: number) => {
                if (i < slots.length) {
                    current[i] = p.id;
                    changed = true;
                }
            });
        }

        // Clean assignments for participants that left or for slots out of range
        const presentIds = new Set(participantIds);
        Object.keys(current).forEach((k) => {
            const idx = Number(k);
            const pid = current[idx];
            if (idx >= slots.length || !presentIds.has(pid)) {
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
            for (let i = 0; i < slots.length && arr.length; i++) {
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
    }, [dispatch, immersive?.enabled, tpl?.id, participantIds.join(","), tracks, immersive?.assignments, slots.length]);

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDragStart = (index: number) => () => setDragIndex(index);
    const handleDrop = (index: number) => (e?: React.DragEvent) => {
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
            dispatch(setImmersiveAssignments(next));
            setDragIndex(null);
            return;
        }

        if (dragIndex !== null && dragIndex !== index) {
            dispatch(swapImmersiveSlots(dragIndex, index));
        }
        setDragIndex(null);
    };

    if (!immersive?.enabled || !tpl) {
        return null;
    }

    return (
        <div className={classes.root}>
            <div className={classes.background} style={{ backgroundImage: `url(${tpl.backgroundUrl})` }} />
            {slots.map((s, idx) => {
                const pid = assignments[idx];
                const p = ordered.find((pp: any) => pp.id === pid);
                let videoEl: React.ReactNode = null;

                if (p) {
                    const track = getTrackByMediaTypeAndParticipant(tracks, MEDIA_TYPE.VIDEO, p.id);

                    if (track && !track.muted && track.jitsiTrack?.stream) {
                        videoEl = (
                            <video
                                autoPlay
                                muted
                                playsInline
                                ref={(el) => {
                                    if (el && el.srcObject !== track.jitsiTrack.stream) {
                                        el.srcObject = track.jitsiTrack.stream;
                                    }
                                }}
                                className={classes.video}
                            />
                        );
                    } else {
                        videoEl = (
                            <div className={classes.avatarWrapper}>
                                <Avatar size={128} participantId={p.id} />
                            </div>
                        );
                    }
                }

                function formatNameOrEmail(input) {
                    if (!input) return "";

                    // Nếu là email
                    if (input.includes("@")) {
                        return input.split("@")[0];
                    }

                    // Nếu là họ tên
                    const parts = input.trim().split(/\s+/);
                    if (parts.length === 1) return parts[0];

                    const initials = parts
                        .slice(0, -1)
                        .map((word) => word[0].toUpperCase())
                        .join("");
                    const lastName = parts[parts.length - 1];

                    return `${initials}.${lastName}`;
                }

                return (
                    <div
                        key={idx}
                        className={cx(classes.slot, pid === local?.id ? classes.slotHighlight : classes.slotNormal)}
                        style={{
                            borderRadius: "5rem",
                            border: "10px solid #41b6fb",
                            left: `${s.x}%`,
                            top: `${s.y}%`,
                            width: `${s.w}%`,
                            height: `${s.h}%`,
                        }}
                    >
                        <div
                            draggable={Boolean(p)}
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
                                        padding: "3px 15px",
                                        background: "linear-gradient(90deg, #BCF2FF 0%, #FFF 50.2%, #BCF2FF 100%)",
                                        color: "#015d92ff",
                                        fontSize: "2rem",
                                        lineHeight: 1.4,
                                        pointerEvents: "none",
                                        border: "10px solid #41b6fb",
                                        borderRadius: "3rem",
                                        zIndex: 1000,
                                    }}
                                >
                                    {formatNameOrEmail(p.name)}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
