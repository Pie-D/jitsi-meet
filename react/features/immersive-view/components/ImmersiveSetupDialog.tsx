import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import Dialog from '../../base/ui/components/web/Dialog';
import { IconMemberImmersiveView } from '../../base/icons/svg';
import { IMMERSIVE_TEMPLATES, getTemplateSlots } from '../templates';
import { useTranslation } from 'react-i18next';
import { setImmersiveEnabled, setImmersiveSlotCount, setImmersiveTemplate } from '../actions';
import { IMMERSIVE_ALLOWED_SLOT_COUNTS, ImmersiveSlotCount } from '../constants';
import { isLocalParticipantModerator } from '../../base/participants/functions';
import { IReduxState } from '../../app/types';


const useStyles = makeStyles()(theme => ({
    modalWide: {
        width: 'min(96vw, 980px)'
    },
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(3),
        maxWidth: 980,
        width: '100%',
        margin: '0 auto',
        padding: theme.spacing(1.5)
    },
    hero: {
        position: 'relative',
        width: '100%',
        height: 'clamp(180px, 35vh, 420px)',
        overflow: 'hidden',
        [theme.breakpoints.down('md')]: {
            height: 'clamp(160px, 36vh, 380px)'
        },
        [theme.breakpoints.down('sm')]: {
            height: 'clamp(150px, 34vh, 340px)'
        }
    },
    heroBg: {
        position: 'absolute',
        inset: 0,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: 12
    },
    heroSlot: {
        position: 'absolute',
        border: '4px solid rgba(255,255,255,0.85)',
        borderRadius: 24,
        [theme.breakpoints.down('md')]: {
            borderWidth: 3,
            borderRadius: 18
        },
        [theme.breakpoints.down('sm')]: {
            borderWidth: 2,
            borderRadius: 14
        }
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing(2),
        [theme.breakpoints.down('sm')]: {
            alignItems: 'flex-start',
            flexDirection: 'column',
            gap: theme.spacing(1)
        }
    },
    title: {
        fontSize: 20,
        fontWeight: 700,
        [theme.breakpoints.down('sm')]: {
            fontSize: 18
        }
    },
    subtitle: {
        color: 'rgba(255,255,255,0.75)',
        marginTop: theme.spacing(0.5)
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: theme.spacing(2),
        marginTop: theme.spacing(1),
        [theme.breakpoints.down('md')]: {
            gridTemplateColumns: 'repeat(2, 1fr)'
        },
        [theme.breakpoints.down('sm')]: {
            gridTemplateColumns: '1fr'
        }
    },
    card: {
        position: 'relative',
        background: '#0b1a2b',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        border: '2px solid transparent',
        transition: 'transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
            borderColor: 'rgba(77,163,255,0.65)'
        }
    },
    cardSelected: {
        borderColor: '#4da3ff'
    },
    preview: {
        position: 'relative',
        paddingTop: '56.25%'
    },
    previewBg: {
        position: 'absolute',
        inset: 0,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    },
    previewSlot: {
        position: 'absolute',
        border: '2px solid rgba(255,255,255,0.8)',
        borderRadius: 12
    },
    countBadge: {
        position: 'absolute',
        right: 8,
        bottom: 8,
        background: 'rgba(0,0,0,0.55)',
        borderRadius: 8,
        padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing(0.5),
        [theme.breakpoints.down('sm')]: {
            right: 6,
            bottom: 6
        }
    },
    slotCounts: {
        display: 'flex',
        gap: theme.spacing(1),
        marginTop: theme.spacing(1),
        flexWrap: 'wrap'
    },
    slotBtn: {
        padding: `${theme.spacing(0.5)} ${theme.spacing(1.5)}`,
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: 6,
        cursor: 'pointer',
        background: 'transparent',
        minWidth: 56,
        transition: 'all 120ms ease',
        '&:hover': {
            borderColor: 'rgba(255,255,255,0.55)'
        }
    },
    slotBtnActive: {
        borderColor: '#4da3ff',
        background: 'rgba(77,163,255,0.1)'
    },
    slotBtnContent: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing(0.75)
    },
    slotIcon: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 16,
        height: 16
    }
}));

export default function ImmersiveSetupDialog() {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const { classes, cx } = useStyles();
    const isModerator = useSelector(isLocalParticipantModerator);
    const templateIds = Object.keys(IMMERSIVE_TEMPLATES);
    const [ selectedTpl, setSelectedTpl ] = useState(templateIds[0]);
    const [ selectedCount, setSelectedCount ] = useState<ImmersiveSlotCount>(IMMERSIVE_ALLOWED_SLOT_COUNTS[0]);

    // Chỉ moderator mới có thể setup immersive view
    if (!isModerator) {
        return (
            <Dialog
                className = { classes.modalWide }
                cancel = {{ translationKey: 'dialog.Cancel' }}
                titleKey = 'immersive.accessDenied'
                size = 'medium'>
                <div className = { classes.container }>
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        {t('immersive.moderatorOnly')}
                    </div>
                </div>
            </Dialog>
        );
    }

    const items = useMemo(() => templateIds.map(id => IMMERSIVE_TEMPLATES[id]), [ templateIds ]);
    const previewSlots = useMemo(() => getTemplateSlots(selectedTpl, selectedCount), [ selectedTpl, selectedCount ]);

    const onSubmit = () => {
        dispatch(setImmersiveTemplate(selectedTpl));
        dispatch(setImmersiveSlotCount(selectedCount));
        dispatch(setImmersiveEnabled(true));
    };

    return (
        <Dialog
            className = { classes.modalWide }
            cancel = {{ translationKey: 'dialog.Cancel' }}
            ok = {{ translationKey: 'immersive.start' }}
            titleKey = 'immersive.selectTitle'
            size = 'large'
            onSubmit = { onSubmit }>
            <div className = { classes.container }>
                {/* Hero preview */}
                <div className = { classes.hero }>
                    <div
                        className = { classes.heroBg }
                        style = {{ backgroundImage: `url(${IMMERSIVE_TEMPLATES[selectedTpl].backgroundUrl})` }} />
                    {previewSlots.map((s, i) => (
                        <div
                            key = { i }
                            className = { classes.heroSlot }
                            style = {{
                                left: `${s.x}%`,
                                top: `${s.y}%`,
                                width: `${s.w}%`,
                                height: `${s.h}%`
                            }} />
                    ))}
                </div>

                {/* Header with text and slot count chips */}
                <div>
                    <div className = { classes.header }>
                        <div className = { classes.title }>{t('immersive.secondTitle')}</div>
                        <div className = { classes.slotCounts }>
                            {IMMERSIVE_ALLOWED_SLOT_COUNTS.map(c => (
                                <button
                                    key = { c }
                                    className = { cx(classes.slotBtn, selectedCount === c && classes.slotBtnActive) }
                                    onClick = { () => setSelectedCount(c) }>
                                    <span className = { classes.slotBtnContent }>
                                        <span className = { classes.slotIcon }>
                                            <IconMemberImmersiveView />
                                        </span>
                                        {c}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className = { classes.subtitle }>{t('immersive.description')}</div>
                </div>

                {/* Template grid */}
                <div className = { classes.grid }>
                    {items.map(tpl => {
                        const slots = getTemplateSlots(tpl.id, selectedCount);
                        return (
                            <div
                                key = { tpl.id }
                                className = { cx(classes.card, selectedTpl === tpl.id && classes.cardSelected) }
                                onClick = { () => setSelectedTpl(tpl.id) }>
                                <div className = { classes.preview }>
                                    <div
                                        className = { classes.previewBg }
                                        style = {{ backgroundImage: `url(${tpl.backgroundUrl})` }} />
                                    {slots.map((s, i) => (
                                        <div
                                            key = { i }
                                            className = { classes.previewSlot }
                                            style = {{
                                                left: `${s.x}%`,
                                                top: `${s.y}%`,
                                                width: `${s.w}%`,
                                                height: `${s.h}%`
                                            }} />
                                    ))}
                                    <div className = { classes.countBadge }>
                                        <span className = { classes.slotIcon }>
                                            <IconMemberImmersiveView />
                                        </span>
                                        {selectedCount}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Dialog>
    );
}


