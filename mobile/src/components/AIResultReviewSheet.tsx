import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Image } from 'expo-image'

import { speciesApi } from '../services/api'
import type { AiIdentifyResult, RarityTier, Species } from '../types/api'

interface Props {
  photoUri: string
  result: AiIdentifyResult
  defaultTrainingConsent: boolean
  mode: 'live' | 'queued'
  onConfirm: (input: { speciesId: string; speciesName: string; rarityTier: RarityTier; aiTrainingConsent: boolean }) => void
  onSecondaryAction: () => void
}

export function AIResultReviewSheet({
  photoUri,
  result,
  defaultTrainingConsent,
  mode,
  onConfirm,
  onSecondaryAction,
}: Props) {
  const confidence = Math.round(result.confidence * 100)
  const isHighConfidence = result.confidence >= 0.85
  const [selectedSpecies, setSelectedSpecies] = useState(result.species)
  const [aiTrainingConsent, setAiTrainingConsent] = useState(defaultTrainingConsent)
  const [searchVisible, setSearchVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Species[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    setSelectedSpecies(result.species)
  }, [result.species])

  useEffect(() => {
    setAiTrainingConsent(defaultTrainingConsent)
  }, [defaultTrainingConsent])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await speciesApi.list({ search: searchQuery.trim(), limit: 10, page: 1 })
      setSearchResults(response.data.data)
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const secondaryLabel = mode === 'queued' ? '나중에 검토' : '다시 찍기'
  const confirmLabel =
    mode === 'queued'
      ? '검토 후 저장'
      : isHighConfidence
        ? '✓ 목격 기록'
        : '검토 후 기록'

  return (
    <View style={styles.resultContainer}>
      <Image source={{ uri: photoUri }} style={styles.resultPhoto} contentFit="cover" />

      <View style={styles.resultSheet}>
        <Text style={styles.resultTitle}>{mode === 'queued' ? '대기 중인 AI 검토' : 'AI 식별 결과'}</Text>

        <View style={[styles.resultCard, selectedSpecies.species_id === result.species_id && isHighConfidence && styles.resultCardHigh]}>
          <View style={styles.resultCardHeader}>
            <View>
              <Text style={styles.resultSpeciesKo}>{selectedSpecies.name_ko}</Text>
              <Text style={styles.resultSpeciesSci}>{selectedSpecies.name_sci}</Text>
            </View>
            <View style={[styles.confidenceBadge, selectedSpecies.species_id === result.species_id && isHighConfidence && styles.confidenceBadgeHigh]}>
              <Text style={styles.confidenceText}>
                {selectedSpecies.species_id === result.species_id ? `${confidence}%` : '수정'}
              </Text>
            </View>
          </View>
          {selectedSpecies.species_id === result.species_id ? (
            result.species.fun_fact_ko ? <Text style={styles.funFact}>{result.species.fun_fact_ko}</Text> : null
          ) : (
            <Text style={styles.funFact}>AI 결과를 사용자가 다른 종으로 수정해 저장합니다.</Text>
          )}
        </View>

        <View style={styles.top3}>
          <Text style={styles.top3Title}>후보 검토</Text>
          {result.top3.map((item) => {
            const isSelected = selectedSpecies.species_id === item.species.species_id
            return (
              <TouchableOpacity
                key={item.species.species_id}
                style={[styles.top3Item, isSelected && styles.top3ItemSelected]}
                onPress={() => setSelectedSpecies(item.species)}
              >
                <Text style={[styles.top3Name, isSelected && styles.top3NameSelected]}>
                  {item.species.name_ko}
                </Text>
                <Text style={[styles.top3Confidence, isSelected && styles.top3NameSelected]}>
                  {Math.round(item.confidence * 100)}%
                </Text>
              </TouchableOpacity>
            )
          })}
          <TouchableOpacity style={styles.searchBtn} onPress={() => setSearchVisible(true)}>
            <Text style={styles.searchBtnText}>직접 검색해서 종 선택</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.trainingBox}>
          <View style={styles.trainingTextBox}>
            <Text style={styles.trainingTitle}>AI 학습 개선에 사진 활용</Text>
            <Text style={styles.trainingDesc}>
              촬영 이미지를 품질 개선과 재학습에 활용합니다. 동의하지 않아도 저장은 가능합니다.
            </Text>
          </View>
          <Switch
            value={aiTrainingConsent}
            onValueChange={setAiTrainingConsent}
            trackColor={{ false: '#E0E0E0', true: '#95D5B2' }}
            thumbColor={aiTrainingConsent ? '#1B4332' : '#FFFFFF'}
          />
        </View>

        <View style={styles.resultButtons}>
          <TouchableOpacity style={styles.retakeBtn} onPress={onSecondaryAction}>
            <Text style={styles.retakeBtnText}>{secondaryLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => onConfirm({
              speciesId: selectedSpecies.species_id,
              speciesName: selectedSpecies.name_ko,
              rarityTier: selectedSpecies.rarity_tier,
              aiTrainingConsent,
            })}
          >
            <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={searchVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>종 직접 검색</Text>
            <View style={styles.searchRow}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="종 이름 검색"
                placeholderTextColor="#8E8E93"
                style={styles.searchInput}
              />
              <TouchableOpacity style={styles.searchActionBtn} onPress={handleSearch}>
                <Text style={styles.searchActionBtnText}>검색</Text>
              </TouchableOpacity>
            </View>

            {isSearching ? (
              <ActivityIndicator style={{ paddingVertical: 16 }} color="#1B4332" />
            ) : (
              <View style={styles.searchResults}>
                {searchResults.map((species) => (
                  <TouchableOpacity
                    key={species.species_id}
                    style={styles.searchResultItem}
                    onPress={() => {
                      setSelectedSpecies(species)
                      setSearchVisible(false)
                    }}
                  >
                    <Text style={styles.searchResultName}>{species.name_ko}</Text>
                    <Text style={styles.searchResultSci}>{species.name_sci}</Text>
                  </TouchableOpacity>
                ))}
                {searchQuery.trim() && searchResults.length === 0 ? (
                  <Text style={styles.emptySearch}>검색 결과가 없습니다.</Text>
                ) : null}
              </View>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={() => setSearchVisible(false)}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  resultContainer: { flex: 1 },
  resultPhoto: { flex: 1 },
  resultSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 16,
  },
  resultTitle: { fontSize: 13, color: '#AEAEB2', fontWeight: '600', textTransform: 'uppercase' },
  resultCard: {
    backgroundColor: '#F8F9FA', borderRadius: 14, padding: 16, gap: 8,
    borderWidth: 2, borderColor: 'transparent',
  },
  resultCardHigh: { borderColor: '#52B788' },
  resultCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resultSpeciesKo: { fontSize: 22, fontWeight: '700', color: '#1C1C1E' },
  resultSpeciesSci: { fontSize: 14, color: '#6C6C70', fontStyle: 'italic' },
  confidenceBadge: {
    backgroundColor: '#F2F2F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  confidenceBadgeHigh: { backgroundColor: '#D8F3DC' },
  confidenceText: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  funFact: { fontSize: 13, color: '#6C6C70', lineHeight: 18 },
  top3: { gap: 8 },
  top3Title: { fontSize: 13, color: '#AEAEB2', fontWeight: '600' },
  top3Item: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#F2F2F7',
  },
  top3ItemSelected: {
    borderColor: '#1B4332',
    backgroundColor: '#F0F7F0',
  },
  top3Name: { fontSize: 15, color: '#1C1C1E' },
  top3NameSelected: { color: '#1B4332', fontWeight: '700' },
  top3Confidence: { fontSize: 15, color: '#AEAEB2' },
  searchBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DADADA',
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchBtnText: { color: '#1C1C1E', fontSize: 14, fontWeight: '600' },
  trainingBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  trainingTextBox: { flex: 1 },
  trainingTitle: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  trainingDesc: { marginTop: 4, fontSize: 12, lineHeight: 18, color: '#6C6C70' },
  resultButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  retakeBtn: {
    flex: 1, height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    justifyContent: 'center', alignItems: 'center',
  },
  retakeBtnText: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  confirmBtn: {
    flex: 2, height: 48, borderRadius: 12,
    backgroundColor: '#1B4332', justifyContent: 'center', alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  searchRow: { flexDirection: 'row', gap: 10 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DADADA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#1C1C1E',
  },
  searchActionBtn: {
    backgroundColor: '#1B4332',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchActionBtnText: { color: '#FFFFFF', fontWeight: '700' },
  searchResults: { gap: 8 },
  searchResultItem: {
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 12,
    padding: 14,
  },
  searchResultName: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  searchResultSci: { marginTop: 4, fontSize: 12, color: '#6C6C70', fontStyle: 'italic' },
  emptySearch: { textAlign: 'center', paddingVertical: 16, color: '#6C6C70' },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 15, fontWeight: '600', color: '#6C6C70' },
})
