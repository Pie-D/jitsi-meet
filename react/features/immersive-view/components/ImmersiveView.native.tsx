import React, { useEffect, useMemo } from 'react';
import { Dimensions, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from "react-redux";

import { IReduxState } from "../../app/types";
import Avatar from "../../base/avatar/components/Avatar";
import { MEDIA_TYPE } from "../../base/media/constants";
import VideoTrack from "../../base/media/components/native/VideoTrack";
import { getRemoteParticipants } from "../../base/participants/functions";
import { getTrackByMediaTypeAndParticipant } from "../../base/tracks/functions.any";
import { setImmersiveAssignments } from "../actions";
import { DEFAULT_IMMERSIVE_SLOT_COUNT } from "../constants";
import "../reducer";
import { IMMERSIVE_TEMPLATES, getTemplateSlots } from "../templates";

const styles = StyleSheet.create({
    root: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        elevation: 0
    },
    canvas: {
        position: 'absolute',
        left: 0,
        top: 0
    },
    background: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    slot: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.05)',
        overflow: 'hidden',
    },
    slotHighlight: {
        borderWidth: 2,
        borderColor: '#4da3ff',
    },
    slotNormal: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
    },
    slotContent: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    avatarWrapper: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    avatarNameText: {
        marginTop: 8,
        color: '#ffffff',
        fontSize: 14,
        lineHeight: 18,
        fontWeight: '600',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        maxWidth: '90%',
    },
    nameLabel: {
        position: 'absolute',
        left: '50%',
        bottom: 0,
        transform: [{ translateX: -50 }, { translateY: 50 }],
        padding: 3,
        paddingHorizontal: 15,
        backgroundColor: '#fff',
        borderRadius: 30,
        borderWidth: 10,
        borderColor: '#41b6fb',
        zIndex: 1000,
        maxWidth: '90%',
    },
    nameLabelText: {
        color: '#015d92ff',
        fontSize: 12,
        lineHeight: 16.8,
        fontWeight: '500',
    },
});

/**
 * Formats name or email for display in immersive view.
 */
function formatNameOrEmail(input: string): string {
    if (!input) return "";

    // If it's an email
    if (input.includes("@")) {
        return input.split("@")[0];
    }

    // If it's a full name
    const parts = input.trim().split(/\s+/);
    const length = parts.length;

    if (length === 1) return parts[0]; // single word, keep as is
    if (length === 2) return parts.join(" "); // two words, keep as is
    if (length === 3) return parts.join(" "); // three words, keep as is

    // Name longer than 3 words -> abbreviate
    const initials = parts
        .slice(0, -1)
        .map((word: string) => word[0].toUpperCase())
        .join("");
    const lastName = parts[length - 1];

    return `${initials}.${lastName}`;
}

/**
 * ImmersiveView component for React Native
 * Displays participants in a configurable background template
 */
export default function ImmersiveView() {
    const dispatch = useDispatch();
    const immersive = useSelector((state: IReduxState) => state['features/immersive-view']);
    
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    const targetAspect = 16 / 9;
    let canvasWidth = screenWidth;
    let canvasHeight = Math.round(canvasWidth / targetAspect);
    if (canvasHeight > screenHeight) {
        canvasHeight = screenHeight;
        canvasWidth = Math.round(canvasHeight * targetAspect);
    }
    const offsetX = Math.round((screenWidth - canvasWidth) / 2);
    const offsetY = Math.round((screenHeight - canvasHeight) / 2);

    const remotesMap = useSelector((s: IReduxState) => getRemoteParticipants(s));
    const remotes = remotesMap ? Array.from(remotesMap.values()) : [];
    const local = useSelector((s: IReduxState) => s['features/base/participants']?.local);
    const ordered = useMemo(() => [ local, ...remotes ].filter(Boolean), [ local, remotes ]);

    // Get template (same logic as web version)
    // Ensure templateId is set if immersive is enabled
    const templateId = immersive?.enabled && immersive?.templateId
        ? immersive.templateId
        : (immersive?.enabled ? 'cati' : undefined);
    const tpl = templateId ? IMMERSIVE_TEMPLATES[templateId] : undefined;

    const slots = useMemo(
        () => getTemplateSlots(templateId, immersive?.slotCount || DEFAULT_IMMERSIVE_SLOT_COUNT),
        [ templateId, immersive?.slotCount ]
    );

    const assignments = immersive?.assignments || {};

    const tracks = useSelector((s: IReduxState) => s["features/base/tracks"]);
    const isVideoOn = (pid: string) => {
        const t = getTrackByMediaTypeAndParticipant(tracks, MEDIA_TYPE.VIDEO, pid);
        return Boolean(t && !t.muted);
    };
    const participantIds = useMemo(() => ordered.map((p: any) => p.id), [ordered]);

    // Remove this useEffect - template should be set by reducer default state

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

        // If no assignments yet, initialize with current participants
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

        // Determine candidates to auto-fill: prefer participants with active video first
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
        console.log('[ImmersiveView] sync assignments', {
            enabled: immersive?.enabled,
            templateId,
            slots: slots.length,
            ordered: ordered.length,
            assigned: Object.keys(current).length
        });
    }, [ dispatch, immersive?.enabled, templateId, participantIds.join(','), tracks, immersive?.assignments, slots.length, ordered, tpl ]);

    // Drag and drop not implemented on mobile

    // Only render when explicitly enabled AND have valid template AND there are participants/slots
    if (!immersive?.enabled || !tpl) {
        return null;
    }

    // Background: dùng ảnh CMC bên trong canvas; phần ngoài canvas là nền đen
    let backgroundSrc: any = undefined;
    if (tpl.backgroundUrl && /^https?:\/\//.test(tpl.backgroundUrl)) {
        backgroundSrc = { uri: tpl.backgroundUrl };
    } else if (tpl.backgroundUrl === 'local:cmc') {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            backgroundSrc = require('../../../../images/cmc-images/bg-cmc.jpg');
        } catch {}
    }

    // Nếu không resolve được ảnh, vẫn tiếp tục (canvas sẽ không render ảnh)

    // Also require participants and slots to avoid blank overlay
    if (!ordered.length || !slots.length) {
        return null;
    }

    console.log('[ImmersiveView] render', {
        enabled: immersive?.enabled,
        templateId,
        hasTpl: Boolean(tpl),
        bg: tpl.backgroundUrl,
        bgValid: Boolean(backgroundSrc),
        slots: slots.length,
        participants: ordered.length
    });

    return (
        <View style={styles.root} pointerEvents='none'>
            {/* Letterbox fondo ngoài canvas: đen */}
            <View style={[ styles.background, { backgroundColor: 'black' } ]} />

            {/* 16:9 canvas centered */}
            <View style={[ styles.canvas, { left: offsetX, top: offsetY, width: canvasWidth, height: canvasHeight } ]}>
                { backgroundSrc && (
                    <ImageBackground
                        source = { backgroundSrc }
                        style = { styles.background }
                        resizeMode = 'cover' />
                ) }

                {(slots || []).map((s, idx) => {
                const pid = assignments[idx];
                const p = ordered.find((pp: any) => pp.id === pid);

                // Tính slot dimensions trước
                const boxLeft = (s.x / 100) * canvasWidth;
                const boxTop = (s.y / 100) * canvasHeight;
                const boxW = (s.w / 100) * canvasWidth;
                const boxH = (s.h / 100) * canvasHeight;
                const side = Math.min(boxW, boxH);
                const innerLeft = boxLeft + ((boxW - side) / 2);
                const innerTop = boxTop + ((boxH - side) / 2);
                // Avatar size tính theo 60% của slot để tránh tràn, để lại không gian cho tên
                const avatarSize = Math.round(side * 0.6);

                let videoEl: React.ReactNode = null;

                if (p) {
                    const track = getTrackByMediaTypeAndParticipant(tracks, MEDIA_TYPE.VIDEO, p.id);

                    if (track && !track.muted) {
                        // Video is available - use VideoTrack component
                        videoEl = (
                            <VideoTrack
                                videoTrack = { track }
                                zOrder = { 0 } />
                        );
                    } else {
                        // Show avatar with name when video is off
                        videoEl = (
                            <View style={styles.avatarWrapper}>
                                <Avatar size={avatarSize} participantId={p.id} />
                                <Text style={styles.avatarNameText} numberOfLines={1}>
                                    {formatNameOrEmail(p.name || 'CMC ATIer')}
                                </Text>
                            </View>
                        );
                    }
                }

                const isLocalParticipant = pid === local?.id;

                return (
                    <View key={idx}>
                        {/* Outer slot area (transparent, for layout reference) */}
                        <View
                            style={[
                                styles.slot,
                                isLocalParticipant ? styles.slotHighlight : styles.slotNormal,
                                {
                                    left: innerLeft,
                                    top: innerTop,
                                    width: side,
                                    height: side,
                                    borderWidth: 4,
                                    borderColor: '#d8c5a3', // frame color
                                    backgroundColor: '#ffffff',
                                    borderRadius: 4
                                }
                            ]}
                        >
                            <View style={styles.slotContent}>
                                {videoEl}
                            </View>
                            {/* Ẩn tên người dùng như giao diện web */}
                        </View>
                    </View>
                );
            })}
            </View>
        </View>
    );
}


