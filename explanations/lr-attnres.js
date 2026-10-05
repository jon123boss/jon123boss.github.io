export default {
  slug: 'lr-attnres',
  title: 'Low-Rank Attention Residuals',
  shortTitle: 'LR-AttnRes',
  sourceVersion: 'arXiv v2 · 22 September 2026',
  lead: 'A layer needs rich information from earlier layers, but choosing which information to read may require only a small description. LR-AttnRes uses a narrow slice to make that choice, then carries the entire selected representation forward.',
  sections: [
    {
      id: 'starting-point',
      title: 'Start with the information a layer receives',
      html: String.raw`
<p>A language model turns each token, a piece of text, into a vector of \(d\) numbers. A <strong>Transformer</strong> repeatedly updates these vectors. Each Transformer block contains token attention, which gathers information from other token positions, and a feed-forward network, which transforms each position’s features. In a causal language model, token attention cannot inspect future tokens.</p>
<p>A <strong>residual connection</strong> adds each transformation’s output to a running state. Let \(o_0\) be the embedding and \(o_i\) the output written by sub-layer \(i\). Before sub-layer \(t\), the ordinary state is</p>
\[h_t=o_0+\sum_{i=1}^{t-1}o_i.\]
<p>Every earlier write has coefficient one. The model can learn what to write, but the residual rule does not explicitly choose which earlier writes to emphasize at each new read.</p>
<p><strong>Attention Residuals, or AttnRes, makes that choice learnable.</strong> It retains earlier writes as sources and forms a weighted mixture. This is attention <em>across depth at the same token position</em>. The usual attention across token positions still happens inside the sub-layers. <a href="https://arxiv.org/pdf/2607.09694v2#page=3" target="_blank" rel="noopener noreferrer">§3.1 / p. 3</a></p>`
    },
    {
      id: 'routing-rule',
      title: 'A short description chooses a full-width value',
      html: String.raw`
<p>Attention separates three roles: a <strong>query</strong> describes what a reader seeks, a <strong>key</strong> describes a source for matching, and a <strong>value</strong> carries what the reader receives. Standard AttnRes uses every coordinate of a source as both key and value. LR-AttnRes uses only its final \(r\) coordinates for the key, with \(r&lt;d\), while retaining all \(d\) value coordinates.</p>
<p>For one token and one read site, the complete rule is</p>
\[k_i=\operatorname{tail}_r(o_i),\qquad
\bar{k}_i=\frac{k_i}{\sqrt{\frac{1}{r}\sum_{j=1}^{r}k_{i,j}^{2}+\epsilon}},\]
\[z_{t,i}=q_t^\top\bar{k}_i,\qquad
\alpha_{t,i}=\frac{e^{z_{t,i}}}{\sum_{j\in S_t}e^{z_{t,j}}},\qquad
h_t=\sum_{i\in S_t}\alpha_{t,i}o_i.\]
<p>\(S_t\) is the available source set. RMS normalization divides a key by its root-mean-square size; \(\epsilon&gt;0\) prevents division by zero. The dot product measures alignment with the query. Softmax converts scores into positive weights summing to one.</p>
<p>The query \(q_t\in\mathbb{R}^{r}\) is learned separately for each read site and is <strong>input-independent</strong>: the same reader uses the same query for every token. Routing remains input-dependent because source keys change with the text. Zero-initialized queries initially give uniform source weights.</p>
<table><thead><tr><th>Tensor</th><th>Shape</th><th>Meaning</th></tr></thead><tbody>
<tr><td>Values \(V\)</td><td>\([S,B,T,d]\)</td><td>Sources × batch × token positions × features</td></tr>
<tr><td>Keys \(K\)</td><td>\([S,B,T,r]\)</td><td>Narrow descriptions of those same sources</td></tr>
<tr><td>Weights</td><td>\([S,B,T]\)</td><td>One distribution over sources per token</td></tr>
<tr><td>Output \(h\)</td><td>\([B,T,d]\)</td><td>Full-width mixture</td></tr>
</tbody></table>
<p>No extra key projection is needed: the key can be a view into the value. Its coordinates are nevertheless learned through the sub-layer’s output weights. Choosing the last coordinates is a convention; there is no intrinsic meaning to “last.” Setting \(r=d\) recovers standard AttnRes. <a href="https://arxiv.org/pdf/2607.09694v2#page=4" target="_blank" rel="noopener noreferrer">§3.2–3.3 / p. 4</a></p>`
    },
    {
      id: 'worked-example',
      title: 'A complete four-number example',
      html: String.raw`
<p>Take two values of width \(d=4\), with routing width \(r=2\):</p>
\[o_A=(4,0,1,0),\qquad o_B=(0,4,0,1).\]
<p>Their keys are \((1,0)\) and \((0,1)\). Ignoring epsilon for this example, RMS normalization gives \((\sqrt{2},0)\) and \((0,\sqrt{2})\). Choose \(q=(\log 3/\sqrt{2},0)\). The scores become \((\log 3,0)\), so softmax gives \((3/4,1/4)\).</p>
\[h=\tfrac34o_A+\tfrac14o_B=(3,1,0.75,0.25).\]
<p>The first two coordinates never participated in scoring, yet their information appears in the output. Changing the first coordinate of \(o_A\) from 4 to 8 leaves the weights unchanged and changes the first output coordinate from 3 to 6. This illustrates the separation: <strong>the router inspects a slice; the mixture transports everything.</strong> These illustrative numbers are constructed here, not experimental results.</p>`
    },
    {
      id: 'source-bank',
      title: 'Full history or a few block summaries',
      html: String.raw`
<p><strong>Full routing</strong> retains the embedding and every earlier attention or feed-forward output. With \(L\) Transformer blocks, there are \(2L\) writes. Each sub-layer receives a routed state, and a final read supplies the vocabulary head that predicts the next token.</p>
<p><strong>Block routing</strong> divides those writes into \(N\) contiguous groups. A completed group becomes a sum \(b=\sum_i o_i\). Each read sees the embedding, completed sums, and the current unfinished sum if nonempty. Here “routing block” means a group of writes, not necessarily one Transformer block.</p>
<p>For example, six writes grouped into three pairs expose \(\{o_0,o_1+o_2,o_3\}\) immediately after write three. After write four, the bank becomes \(\{o_0,o_1+o_2,o_3+o_4\}\). Always <strong>sum first, then slice and normalize</strong>.</p>
<p>Grouping saves storage and source reads, but writes within one summary receive a shared mixture coefficient. Their features can reinforce or cancel before scoring. Thus \(N\) changes both the available distinctions and the keys themselves; more sources need not improve learning. <a href="https://arxiv.org/pdf/2607.09694v2#page=3" target="_blank" rel="noopener noreferrer">§3.1–3.3 / pp. 3–4</a>; <a href="https://arxiv.org/pdf/2607.09694v2#page=15" target="_blank" rel="noopener noreferrer">Appendix B.4 / p. 15</a></p>`
    },
    {
      id: 'pytorch',
      title: 'The mechanism in PyTorch-style code',
      html: String.raw`
<p>This follows the paper’s sum-based formulation. Each sub-layer performs attention or a feed-forward transformation <em>without its own residual addition</em>. Queries are learned parameters of shape \([2L,r]\), initialized to zero. The first embedding-only read is an identity, so each query below serves the read after a write.</p>
<pre><code class="language-python">import math
import torch

def rms(x, eps=1e-6):
    return x * torch.rsqrt(x.square().mean(-1, keepdim=True) + eps)

def route(sources, q, r):
    values = torch.stack(sources)       # [S, B, T, d]
    keys = rms(values[..., -r:])        # [S, B, T, r]
    scores = (keys * q).sum(-1)         # [S, B, T]
    weights = scores.softmax(dim=0)    # over SOURCES
    return (weights[..., None] * values).sum(0)

def forward(x, sublayers, queries, r, N=None):
    M = len(sublayers)                  # M = 2L
    N = M if N is None else min(N, M)
    ends = {math.ceil(M * j / N) for j in range(1, N + 1)}
    bank, partial, h = [x], None, x

    for t, (layer, q) in enumerate(zip(sublayers, queries), 1):
        write = layer(rms(h))
        partial = write if partial is None else partial + write
        if t in ends:
            bank.append(partial)
            partial = None
        sources = bank + ([] if partial is None else [partial])
        h = route(sources, q, r)

    return rms(h)                       # then the vocabulary head</code></pre>
<p>Use \(N=\text{None}\) for full routing and \(r=d\) for standard AttnRes. This teaching code omits masking internals and production precision handling; its explicit stacking is also avoidable. The fused kernel reads a list of sources directly. Repository options include other experimental variants, so the paper’s equations determine the method explained here. <a href="https://arxiv.org/pdf/2607.09694v2#page=27" target="_blank" rel="noopener noreferrer">Appendices H–I / pp. 27–28</a></p>`
    },
    {
      id: 'rank-and-normalization',
      title: 'What “low-rank” does—and does not—mean',
      html: String.raw`
<p>Here \(r\) names the routing-key width. Values are neither truncated nor reconstructed from \(r\) numbers. Nor is the method a low-rank adaptation of weight matrices such as LoRA.</p>
<p>A subtle question follows: each query produces one scalar, so why not use one-dimensional keys? The denominator matters:</p>
\[z=\frac{q^\top k}{\sqrt{\lVert k\rVert^2/r+\epsilon}}.\]
<p>One direction determines the numerator, but all \(r\) coordinates determine the norm. Replacing this with a normalized scalar generally changes the function. Also, different read sites have different queries; a shared representation must support them together.</p>
<p>The paper proves a stronger, carefully qualified result for a <strong>full-width-RMS variant</strong>. Instead of normalizing the slice, it normalizes all \(d\) coordinates before slicing. Collect the effective queries into \(Q=[q_1,\ldots,q_J]\). If \(r\geq\operatorname{rank}(Q)\), an orthogonal change of residual coordinates can place their entire span inside the retained slice.</p>
<p>Under the stated assumptions—compatible embeddings, head, normalization, and residual-facing projections—the rotation can be absorbed into existing weights. Every routing distribution and final logit is then preserved in exact arithmetic. The 24-layer architecture has 48 active queries, so width 48 is sufficient under these assumptions. This counts <em>queries</em>, not candidate sources, and does not identify the best training rank.</p>
<p>The theorem retains full-width normalization and does not apply directly to default slice normalization. Six checkpoint conversions show close numerical agreement; floating-point results are not perfectly identical. <a href="https://arxiv.org/pdf/2607.09694v2#page=8" target="_blank" rel="noopener noreferrer">§4.8 / pp. 8–9</a>; <a href="https://arxiv.org/pdf/2607.09694v2#page=13" target="_blank" rel="noopener noreferrer">Appendix B.1–B.2 / pp. 13–14</a></p>`
    },
    {
      id: 'learning',
      title: 'What changes during learning',
      html: String.raw`
<p>A source influences a read twice: through the content it contributes and through the weight it earns. For loss \(\mathcal L\), upstream gradient \(g=\nabla_h\mathcal L\), and source score \(z_i\), the local gradient is</p>
\[\nabla_{o_i}\mathcal L
=\underbrace{\alpha_i g}_{\text{value contribution}}
+\underbrace{\alpha_i\langle g,o_i-h\rangle\nabla_{o_i}z_i}_{\text{routing feedback}}.\]
<p>The second term changes selection according to whether moving the mixture toward this source would improve the loss. With slice normalization, its support lies entirely in the selected coordinates. Other coordinates still receive the direct value gradient. The local value Jacobian has rank at least \(d-1\) for finite logits, rather than being restricted to \(r\).</p>
<p>These are local mathematical facts, treating source slots as independent at one read. Later layers mix coordinates, and total gradients include other paths. The analysis does <strong>not</strong> establish that routing feedback is harmful or that reducing it causes better validation loss. The paper also finds broader source use and lower gradient norms in some comparisons, but neither consistently predicts the best rank. <a href="https://arxiv.org/pdf/2607.09694v2#page=8" target="_blank" rel="noopener noreferrer">§4.6–4.7 / p. 8</a>; <a href="https://arxiv.org/pdf/2607.09694v2#page=14" target="_blank" rel="noopener noreferrer">Appendix B.3 / pp. 14–15</a></p>`
    },
    {
      id: 'evidence',
      title: 'What the experiments establish',
      html: String.raw`
<p>Validation cross-entropy measures next-token prediction error on unseen text; lower is better. The 0.5B-parameter sweep trained 32 rank/grouping configurations on 10B Ultra-FineWeb tokens, using width 1024 and context length 2048. All improved on the ordinary Transformer baseline; 27 of 28 reduced-width configurations improved on their matched full-width routing endpoint.</p>
<p>The best observed sweep setting was \(N=8,r=128\). Replicating that selected configuration and its standard AttnRes counterpart across three paired seeds gave losses \(2.944\pm0.001777\) versus \(2.973\pm0.0009852\), respectively, with improvement in every pair. These are means ± sample standard deviations. Most sweep settings remain single runs.</p>
<p>A full-width-RMS control reached 2.943 in one run. The improvement therefore survives changing the normalization rule, but the tiny difference from slice normalization does not establish superiority. The projected-key alternative also reached a rounded loss of 2.944, with extra projection cost. <a href="https://arxiv.org/pdf/2607.09694v2#page=5" target="_blank" rel="noopener noreferrer">§4.1–4.4 / pp. 5–6</a>; <a href="https://arxiv.org/pdf/2607.09694v2#page=16" target="_blank" rel="noopener noreferrer">Appendix C / pp. 16–17</a></p>
<p>Larger paired models used \(N=8,r=d/4\), without rank tuning at those scales, and 20B training tokens:</p>
<table><thead><tr><th>Scale</th><th>Validation loss: standard → LR</th><th>Eight-task accuracy: standard → LR</th></tr></thead><tbody>
<tr><td>1B</td><td>2.800 → 2.780</td><td>41.87% → 42.27%</td></tr>
<tr><td>4B</td><td>2.738 → 2.706</td><td>42.97% → 43.54%</td></tr>
</tbody></table>
<p>The accuracy gains are 0.40 and 0.57 <em>percentage points</em>. These are equally weighted means over eight zero-shot lm-evaluation-harness tasks, using task-specific raw or length-normalized accuracy. Individual tasks sometimes regress. The larger results are paired runs, not a multi-seed demonstration of universal improvement. <a href="https://arxiv.org/pdf/2607.09694v2#page=7" target="_blank" rel="noopener noreferrer">Table 1 / p. 7</a>; <a href="https://arxiv.org/pdf/2607.09694v2#page=26" target="_blank" rel="noopener noreferrer">Appendix G / p. 26</a></p>`
    },
    {
      id: 'efficiency',
      title: 'Where the savings come from',
      html: String.raw`
<p>For \(S\) sources, standard routing spends roughly \(Sd\) multiply-adds on scores and \(Sd\) on value mixing. LR-AttnRes changes this to \(Sr+Sd\). The counted reduction is</p>
\[1-\frac{d+r}{2d}=\frac{d-r}{2d}.\]
<p>At \(r=d/8\), this is 43.75%. This accounting excludes normalization and softmax, and concerns the residual routing computation, <strong>not the entire Transformer</strong>. Value mixing stays full-width. The source-value cache also stays the same size; slicing avoids adding a separate key cache. Routing-query parameters decrease from \(2Ld\) to \(2Lr\). <a href="https://arxiv.org/pdf/2607.09694v2#page=22" target="_blank" rel="noopener noreferrer">Appendix F / pp. 22–25</a></p>
<p>Measured complete training-step gains from lowering \(r=d\) to \(d/4\), with the same Fast-AttnRes kernel, range from 0.59% to 1.20% across the reported H100/B200 and 1B/4B settings. Each comparison uses five paired timing repeats. Gains combining the new kernel and reduced rank are larger and answer a different question. Timings include forward, backward, transfer, and optimizer work, while excluding compilation, storage reads, evaluation, and logging. <a href="https://arxiv.org/pdf/2607.09694v2#page=9" target="_blank" rel="noopener noreferrer">§4.9 / p. 9</a>; <a href="https://arxiv.org/pdf/2607.09694v2#page=28" target="_blank" rel="noopener noreferrer">Appendix I / p. 28</a></p>`
    },
    {
      id: 'contribution-and-limits',
      title: 'The contribution, with its boundaries',
      html: String.raw`
<p>Depth-wise attention, block summaries, and static queries come from AttnRes. This work isolates <strong>routing width as a separate design choice from value width</strong>, makes that choice inexpensive through coordinate slicing, and supplies experiments, mathematical analysis, and a fused implementation.</p>
<p>It also explores dedicated projected keys, which add parameters and storage. Keeping static queries preserves the mathematical conditions for AttnRes’s two-phase inference strategy: separately computed source groups can be merged with an online-softmax update. Compatibility is not itself a measured inference speedup. <a href="https://arxiv.org/pdf/2607.09694v2#page=4" target="_blank" rel="noopener noreferrer">§3.4 / p. 4</a>; <a href="https://arxiv.org/pdf/2607.09694v2#page=15" target="_blank" rel="noopener noreferrer">Appendix C / pp. 15–16</a></p>
<p>The evidence covers the reported architectures, data, training budgets, and hardware. It does not establish an optimal universal rank, benefits at arbitrary context lengths, or a causal explanation for the accuracy gains. The proposed conversion of Kimi K3 was not performed. Its measured query-coordinate concentration motivates the idea; it is neither an exact rank measurement nor a recommended routing width. <a href="https://arxiv.org/pdf/2607.09694v2#page=9" target="_blank" rel="noopener noreferrer">§4.8 / p. 9</a>; <a href="https://arxiv.org/pdf/2607.09694v2#page=20" target="_blank" rel="noopener noreferrer">Appendix E / pp. 20–22</a></p>`
    }
  ],
  sources: [
    { label: 'Paper · arXiv v2', url: 'https://arxiv.org/pdf/2607.09694v2' },
    { label: 'Code · GitHub', url: 'https://github.com/jon123boss/LR-AttnRes' }
  ]
};
