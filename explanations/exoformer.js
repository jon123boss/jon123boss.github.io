export default {
  slug: 'exoformer',
  title: 'Attention Projection Mixing with Exogenous Anchors',
  shortTitle: 'ExoFormer',
  sourceVersion: 'arXiv v4 · 27 May 2026',
  lead: 'Give every attention layer a reusable reference to the input, alongside its evolving understanding. ExoFormer learns that reference in a separate projection module, so the first layer no longer has to double as the reference for everyone else.',
  sections: [
    { id: 'starting-point', title: 'Start with what attention does', html: String.raw`
<p>A language model predicts the next <strong>token</strong>, a word or word fragment. It turns each token into a vector of numbers, then repeatedly updates those vectors through a stack of Transformer layers. Each layer combines <strong>attention</strong>, which exchanges information between positions, with a feed-forward network, which transforms each position separately. A residual connection adds each update to the existing vector.</p>
<p>Suppose the input has \(T\) tokens, vector width \(d\), and \(h\) attention heads of width \(d_h=d/h\). Each head can learn a different way of relating tokens. A learned linear projection is simply a matrix multiplication that re-expresses a vector for a particular job. From the normalized layer input \(X_n\in\mathbb R^{T\times d}\), attention makes:</p>
<ul><li><strong>Queries:</strong> \(Q_n=X_nW_n^Q\), what each position seeks.</li><li><strong>Keys:</strong> \(K_n=X_nW_n^K\), what each position can be matched on.</li><li><strong>Values:</strong> \(V_n=X_nW_n^V\), the information it can contribute.</li></ul>
<p>Each projection has shape \(T\times d\), reshaped into \(h\) heads. Within one head:</p>
\[
A_n=\operatorname{softmax}\!\left(\frac{Q_nK_n^\top}{\sqrt{d_h}}+M\right),\qquad U_n=A_nV_n.
\]
<p>\(A_n\in\mathbb R^{T\times T}\) contains attention weights. The causal mask \(M\) forbids looking at future tokens. Softmax makes each row a set of nonnegative weights summing to one. Thus, attention reads a weighted average of available values.</p>
<p><strong>Gated attention</strong> additionally computes \(G_n=X_nW_n^G\) and scales the retrieved features by \(\sigma(G_n)\), where sigmoid maps numbers into \((0,1)\). Heads are joined and projected back into the residual stream: \(O_n=\operatorname{concat}(U_n\odot\sigma(G_n))W_n^O\). This gate filters retrieved features; it does not choose attention destinations. <a href="https://arxiv.org/pdf/2601.08131v4#page=3" target="_blank" rel="noopener noreferrer">§3.1–3.3 / p. 3</a></p>
` },
    { id: 'separate-reference', title: 'Why give attention a separate reference?', html: String.raw`
<p>As layers update a token vector, useful original details can become harder to access. Imagine repeatedly editing a document while occasionally consulting the original. Cross-layer projection reuse supplies that reference directly to attention.</p>
<p><strong>ResFormer</strong> already reuses the first layer’s values. This paper first builds <strong>NuResFormer</strong>: it extends reuse to queries, keys, values, and gate logits, normalizing the reused projections. But the first layer now has two jobs: compute its own useful update and produce projections useful throughout the whole network. The paper calls this <em>first-layer tension</em>.</p>
<p><strong>ExoFormer</strong> assigns the reference job to separate learned matrices. For each component \(S\in\{Q,K,V,G\}\):</p>
\[
S_{\mathrm{anc}}=H_0W_{\mathrm{anc}}^S,\qquad W_{\mathrm{anc}}^S\in\mathbb R^{d\times d}.
\]
<p>\(H_0\) contains input embeddings. These four <strong>anchors</strong> are computed once for the input and reused across depth. “Exogenous” means outside the sequential layer stack: the anchors still come from the input and are learned during training. They are neither external knowledge nor a single fixed vector shared by every token. Their values change with the input; their projection matrices receive gradients from all consuming layers.</p>
<p>The central contribution is this separation together with normalized mixing across all four pathways. Attention, gating, normalization, and value reuse themselves predate the paper. Unlike mixing many earlier hidden states <em>before</em> projection, this design mixes a current projection with one persistent anchor <em>after</em> projection. <a href="https://arxiv.org/pdf/2601.08131v4#page=2" target="_blank" rel="noopener noreferrer">§2–3.5 / pp. 2–4</a></p>
` },
    { id: 'mixing-rule', title: 'The whole mechanism in one equation', html: String.raw`
\[
\widehat S_n=\lambda^S_{n,1}\odot\operatorname{RMSNorm}(S_{\mathrm{anc}})
+\lambda^S_{n,2}\odot S_n,\qquad S\in\{Q,K,V,G\}.
\]
<p>The first term supplies the reference; the second supplies the current interpretation. Every layer learns its own two coefficients for every component. These are unconstrained learned weights, <strong>not probabilities</strong>: they need not sum to one or stay positive. Static coefficients start at \(0.5\).</p>
<p>Normalization prevents the anchor’s raw size from determining its influence. For one token’s head vector \(s\):</p>
\[
\operatorname{RMSNorm}(s)=g\odot\frac{s}{\sqrt{\frac{1}{d_h}\sum_{j=1}^{d_h}s_j^2+\epsilon}}.
\]
<p>It divides by root-mean-square magnitude, then applies learned channel gains \(g\); \(\epsilon\) prevents division by zero. The division preserves direction, although unequal learned gains can change it. This is scale control, not full whitening or a guarantee of equal feature variances.</p>
<table><thead><tr><th>Variant</th><th>One coefficient per…</th><th>Weights per component per layer</th></tr></thead><tbody><tr><td>Scalar (S)</td><td>whole projection</td><td>2</td></tr><tr><td>Headwise (H)</td><td>head</td><td>\(2h\)</td></tr><tr><td>Elementwise (E)</td><td>head channel</td><td>\(2d\)</td></tr></tbody></table>
<p>These granularities describe <em>mixing coefficients</em>; the attention-output gate remains elementwise. Static weights are shared across tokens. Mixing joins two representations of the <strong>same position</strong>; the subsequent attention operation exchanges information <strong>between positions</strong>.</p>
<p>The ordering matters: normalize anchors → mix projections → normalize mixed queries and keys with <strong>QKNorm</strong> → apply <strong>RoPE</strong>, position-dependent rotations → attention → sigmoid of the mixed gate logits → output projection. The default does not normalize mixed values or gate logits again. <a href="https://arxiv.org/pdf/2601.08131v4#page=4" target="_blank" rel="noopener noreferrer">Eq. 10 / p. 4</a></p>
` },
    { id: 'worked-example', title: 'A two-number example', html: String.raw`
<p>For one value head, suppose the anchor is \((3,4)\), the current value is \((1,-1)\), gains are one, and we ignore \(\epsilon\). Its RMS is \(\sqrt{12.5}\approx3.536\), so the normalized anchor is \((0.849,1.131)\). With coefficients \(0.75\) and \(0.25\):</p>
\[
\widehat V=0.75(0.849,1.131)+0.25(1,-1)\approx(0.886,0.598).
\]
<p>The result retains a positive second feature that the current projection alone would reverse. This illustrates the mechanism, not a claim that positive features are better. If another token has mixed value \((0,1)\) and attention assigns weights \((0.8,0.2)\), the retrieved result is \((0.709,0.679)\). A gate of \((0.5,0.25)\) then produces \((0.355,0.170)\), before output projection. Mixing, attention, and gating perform three distinct operations.</p>
` },
    { id: 'dynamic-mixing', title: 'Let each token decide how much to reuse', html: String.raw`
<p>Static mixing learns a fixed policy for each layer and channel. <strong>Dynamic ExoFormer</strong> adds eight context-dependent scalars per token: two for each of the four projection types. A small network reads the current normalized hidden state:</p>
\[
\gamma_n=\sigma\!\left(\operatorname{GELU}(X_nW_{n,1}^{\mathrm{DM}})W_{n,2}^{\mathrm{DM}}+b_n^{\mathrm{DM}}\right),\quad d\rightarrow16\rightarrow8.
\]
\[
\widehat S_n=(\lambda^S_{n,1}\gamma^S_{n,1})\odot\operatorname{RMSNorm}(S_{\mathrm{anc}})
+(\lambda^S_{n,2}\gamma^S_{n,2})\odot S_n.
\]
<p>Each dynamic scalar broadcasts across heads and channels; the base \(\lambda\) weights retain the chosen granularity. The dynamic model therefore does not generate a separate MLP output for every channel. Deeper hidden states already contain context, allowing reuse strength to depend on what a token currently means.</p>
<p>The MLP’s final weights and bias start at zero, making every \(\gamma=0.5\); dynamic base weights start at \(1\). The resulting effective coefficients are both \(0.5\), matching static initialization. This is an equal mixture, not an identity mapping or an unchanged baseline attention block. <a href="https://arxiv.org/pdf/2601.08131v4#page=4" target="_blank" rel="noopener noreferrer">§3.6 / p. 4</a></p>
` },
    { id: 'pseudocode', title: 'The computation, without implementation clutter', html: String.raw`
<p>This PyTorch-style sketch shows the \(H_0\), elementwise variant. \(B\) is batch size. Each projection becomes \([B,T,h,d_h]\); each layer owns its projection, normalization, mixing, and feed-forward modules. Anchor projection and normalization modules are shared across depth. Setup, caching, and training code are omitted.</p>
<pre><code class="language-python"># Each project module maps d to 4*d, ordered Q, K, V, G.
def project4(project, x):
    B, T, d = x.shape
    return project(x).reshape(B, T, 4, h, dh).unbind(2)

x = embedding(tokens)                     # [B, T, d]
anchors = [norm(s) for norm, s in zip(
    anchor_norms, project4(anchor_project, x))]

for layer in layers:
    z = layer.attn_norm(x)                 # pre-normalization
    current = project4(layer.project, z)
    gamma = layer.dm(z) if dynamic else None  # [B, T, 8]
    mixed = []
    for i, (anchor, local) in enumerate(zip(anchors, current)):
        a, b = layer.mix[i]                # each [h, dh]
        if dynamic:
            a = a * gamma[..., 2*i, None, None]
            b = b * gamma[..., 2*i+1, None, None]
        mixed.append(a * anchor + b * local)

    q, k, v, g = mixed
    q, k = layer.q_norm(q), layer.k_norm(k)  # normalize dh
    q, k, v, g = [s.transpose(1, 2) for s in (q, k, v, g)]
    q, k = layer.rope(q, k)                # [B, h, T, dh]
    u = F.scaled_dot_product_attention(
        q, k, v, is_causal=True, dropout_p=0.0)
    u = u * g.sigmoid()                    # mix logits BEFORE sigmoid
    u = u.transpose(1, 2).reshape_as(x)
    x = x + layer.out(u)
    x = x + layer.ffn(layer.ffn_norm(x))

logits = lm_head(final_norm(x))
</code></pre>
<p>For static mixing, initialize <code>layer.mix</code> to \(0.5\). For dynamic mixing, initialize it to \(1\) and use the MLP initialization above. The sketch follows the paper’s core computation, rather than every optional feature in the released training code. <a href="https://arxiv.org/pdf/2601.08131v4#page=3" target="_blank" rel="noopener noreferrer">§3 / pp. 3–4</a></p>
` },
    { id: 'results', title: 'What the experiments actually establish', html: String.raw`
<p>The main comparison trains roughly 450M-parameter models on 10B FineWeb-Edu tokens, using context length 2,048 and the same Muon-plus-Adam optimization setup. Evaluation uses a 100M-token validation set and six multiple-choice tasks with five examples in each prompt. <strong>Perplexity</strong> is exponentiated average next-token loss; lower is better. Average task accuracy is higher-is-better.</p>
<table><thead><tr><th>Model</th><th>Validation perplexity ↓</th><th>Average accuracy ↑</th></tr></thead><tbody><tr><td>Base Transformer</td><td>14.79</td><td>48.14%</td></tr><tr><td>Gated Attention</td><td>14.64</td><td>48.80%</td></tr><tr><td>ResFormer</td><td>14.32</td><td>49.65%</td></tr><tr><td>Gating + ResFormer</td><td>14.25</td><td>49.09%</td></tr><tr><td>E-NuResFormer, full anchor norms</td><td>14.15</td><td>49.68%</td></tr><tr><td>E-ExoFormer, full anchor norms</td><td>14.13</td><td>49.85%</td></tr><tr><td>Dynamic E-ExoFormer</td><td>14.09</td><td>50.27%</td></tr></tbody></table>
<p>Dynamic E-ExoFormer gains <strong>1.47 percentage points</strong> over Gated Attention. This is not 1.5 times the accuracy. The paper separately reports matching validation loss with about <strong>1.5 times fewer training tokens</strong>; that is a data-efficiency claim, not the same wall-clock speedup. A larger comparison trains approximately 1B parameters on 20B tokens, with validation curves reported in Figure 2. <a href="https://arxiv.org/pdf/2601.08131v4#page=5" target="_blank" rel="noopener noreferrer">Table 1 and setup / p. 5</a>; <a href="https://arxiv.org/pdf/2601.08131v4#page=2" target="_blank" rel="noopener noreferrer">Figure 2 / p. 2</a></p>
<p>The ablations refine the story:</p>
<ul><li><strong>Normalize the source.</strong> Static E-ExoFormer improves from 14.30 without anchor normalization to 14.13 with it. Extra post-mixing normalization reaches 14.08 for QKV and 14.07 for QKVG: a further, smaller improvement.</li><li><strong>External anchors improve perplexity across E/H/S pairs.</strong> Improvements over their fully normalized internal counterparts are small: 0.02, 0.03, and 0.02 respectively. Accuracy does not improve uniformly: headwise accuracy decreases from 49.42% to 49.23%.</li><li><strong>More coefficient freedom is not universally better.</strong> The best NuResFormer accuracy, 49.83%, uses scalar mixing with only Q/K anchor norms. Elementwise mixing is strongest among the static ExoFormer configurations in Table 1.</li><li><strong>The anchor can start deeper.</strong> Dedicated projections from the first layer’s output \(H_1\) yield dynamic perplexity 14.02, versus 14.09 from either \(H_0\) or \(H_2\). Static \(H_1\) reaches 14.07. This retains separate anchor matrices; it does not revert to reusing the first layer’s own attention projections.</li></ul>
<p>The \(\{V,G\}\) ablations mix only values and gate logits; queries and keys remain local. They should not be mistaken for full Q/K/V/G variants. <a href="https://arxiv.org/pdf/2601.08131v4#page=5" target="_blank" rel="noopener noreferrer">Table 1 / p. 5</a>; <a href="https://arxiv.org/pdf/2601.08131v4#page=9" target="_blank" rel="noopener noreferrer">Table 3 / p. 9</a>; <a href="https://arxiv.org/pdf/2601.08131v4#page=19" target="_blank" rel="noopener noreferrer">Table 5 / p. 19</a></p>
` },
    { id: 'mechanism-and-limits', title: 'A plausible explanation, with clear limits', html: String.raw`
<p>The <strong>offloading hypothesis</strong> says that anchors preserve token identity while sequential layers concentrate on transforming features. The paper connects this to a proposed mix–compress–refine trajectory: layers gather context, filter it, then refine representations. Its measurements include token-vector similarity, attention concentration on the first token, and the number of principal components needed to explain 99% of representation variance.</p>
<p>These patterns are consistent with changed information flow, but do not identify exclusive computational roles. At inference, removing the anchor leaves 321 final-layer principal components in ExoFormer versus 181 in NuResFormer. Removing the current projection contribution instead leaves layer-averaged counts of 822 versus 611. Those interventions establish dependence on the trained pathways; they do not alone prove that the retained information is token identity, or that offloading uniquely causes the accuracy gains. “Anchor only” also leaves residual connections, feed-forward networks, and other computation active. <a href="https://arxiv.org/pdf/2601.08131v4#page=7" target="_blank" rel="noopener noreferrer">§4.4–4.5 / pp. 7–9</a>; <a href="https://arxiv.org/pdf/2601.08131v4#page=15" target="_blank" rel="noopener noreferrer">Appendix C / pp. 15–16</a></p>
<p>The cost is four extra \(d\times d\) anchor matrices, plus mixing parameters and optional small MLPs. Computing anchors once avoids repeating those projections at every layer. Nevertheless, the reference implementation reports <strong>8–15% higher latency per token</strong>, above the paper’s illustrative roughly 1.3% FLOP estimate. Shared anchors do not remove layer-specific keys and values or automatically shrink the KV cache. <a href="https://arxiv.org/pdf/2601.08131v4#page=17" target="_blank" rel="noopener noreferrer">Appendix D / pp. 17–18</a></p>
<p>Interpret small differences cautiously: the tables provide no repeated-seed uncertainty estimates; comparisons use approximately matched parameter budgets, with ungated models deeper than gated ones. Evidence covers the reported 450M–1B training regimes, not frontier-scale models, every optimizer, long-context behavior, or every downstream task. The useful architectural idea is concrete: <strong>learn a reusable reference separately, control its scale, and let attention combine it with the current representation.</strong> <a href="https://arxiv.org/pdf/2601.08131v4#page=20" target="_blank" rel="noopener noreferrer">Appendix G / pp. 20–21</a>; <a href="https://arxiv.org/pdf/2601.08131v4#page=10" target="_blank" rel="noopener noreferrer">Scope discussion / p. 10</a></p>
` }
  ],
  sources: [
    { label: 'Paper · arXiv v4', url: 'https://arxiv.org/pdf/2601.08131v4' },
    { label: 'Code · GitHub', url: 'https://github.com/jon123boss/ExoFormer' }
  ]
};
