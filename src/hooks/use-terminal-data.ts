/**
 * TanStack Query Hooks for Live Terminal Telemetry & Analytics
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { BacktestParams, ContractId } from "@/server/domain/types";
import { RawBhavcopyRecord } from "@/server/domain/data-pipeline";

export const QUERY_KEYS = {
  health: ["terminal", "health"],
  dbStats: ["terminal", "dbStats"],
  spot: ["terminal", "pricing", "spot"],
  contracts: ["terminal", "contracts"],
  contract: (id: string) => ["terminal", "contract", id],
  termStructure: ["terminal", "pricing", "termStructure"],
  pairs: ["terminal", "pricing", "pairs"],
  anomalies: (id: string) => ["terminal", "anomalies", id],
  riskRadar: ["terminal", "risk", "radar"],
  pipeline: ["terminal", "pipeline", "stages"],
  quarantine: ["terminal", "pipeline", "quarantine"],
  audit: ["terminal", "audit", "logs"],
  auditVerify: ["terminal", "audit", "verify"],
};

export function useLiveSpot() {
  return useQuery({
    queryKey: QUERY_KEYS.spot,
    queryFn: () => api.getSpot(),
    refetchInterval: 15000,
    staleTime: 10000,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: QUERY_KEYS.health,
    queryFn: () => api.getHealth(),
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

export function useDbStats() {
  return useQuery({
    queryKey: QUERY_KEYS.dbStats,
    queryFn: () => api.getDbStats(),
    refetchInterval: 15000,
  });
}

export function useLiveContracts() {
  return useQuery({
    queryKey: QUERY_KEYS.contracts,
    queryFn: () => api.getContracts(),
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

export function useLiveTermStructure() {
  return useQuery({
    queryKey: QUERY_KEYS.termStructure,
    queryFn: () => api.getTermStructure(),
    refetchInterval: 10000,
  });
}

export function useLivePairs() {
  return useQuery({
    queryKey: QUERY_KEYS.pairs,
    queryFn: () => api.getPairs(),
    refetchInterval: 5000,
  });
}

export function useLiveAnomalies(contractId: ContractId = "GOLDM") {
  return useQuery({
    queryKey: QUERY_KEYS.anomalies(contractId),
    queryFn: () => api.getAnomalies(contractId),
    refetchInterval: 5000,
  });
}

export function useLiveRiskRadar(notional = 2500000) {
  return useQuery({
    queryKey: [...QUERY_KEYS.riskRadar, notional],
    queryFn: () => api.getRiskRadar(notional),
    refetchInterval: 10000,
  });
}

export function useLivePipeline() {
  return useQuery({
    queryKey: QUERY_KEYS.pipeline,
    queryFn: () => api.getPipelineStages(),
    refetchInterval: 10000,
  });
}

export function useLiveQuarantine() {
  return useQuery({
    queryKey: QUERY_KEYS.quarantine,
    queryFn: () => api.getQuarantine(),
    refetchInterval: 10000,
  });
}

export function useLiveAudit() {
  return useQuery({
    queryKey: QUERY_KEYS.audit,
    queryFn: () => api.getAuditLogs(50),
    refetchInterval: 10000,
  });
}

export function useAuditVerification() {
  return useQuery({
    queryKey: QUERY_KEYS.auditVerify,
    queryFn: () => api.verifyAuditChain(),
    refetchOnWindowFocus: false,
  });
}

export function useBacktestMutation() {
  return useMutation({
    mutationFn: (params: BacktestParams) => api.runBacktest(params),
  });
}

export function useIngestRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (record: RawBhavcopyRecord) => api.ingestRecord(record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pipeline });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.quarantine });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.audit });
    },
  });
}
